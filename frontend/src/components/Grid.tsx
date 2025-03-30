"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { useRoom } from "@/hooks/useRoom";

// Define color palette options
const colorOptions = [
  "#000000", // Black
  "#FF0000", // Red
  "#00FF00", // Green
  "#0000FF", // Blue
  "#FFFF00", // Yellow
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#FFA500", // Orange
  "#800080", // Purple
  "#008000", // Dark Green
];

interface GridProps {
  size: number;
  isDrawer: boolean;
  currentWord?: string;
}

// Memoized Node component for optimal rendering
const Node = memo(
  ({
    x,
    y,
    width,
    height,
    color,
    showGridLines,
    onNodeInteraction,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string | null;
    showGridLines: boolean;
    onNodeInteraction: (e: React.MouseEvent) => void;
  }) => {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color || "white"}
        stroke={showGridLines && !color ? "rgba(128, 128, 128, 0.3)" : "none"}
        strokeWidth={showGridLines && !color ? 1 : 0}
        onMouseDown={onNodeInteraction}
        onMouseEnter={onNodeInteraction}
      />
    );
  }
);

Node.displayName = "Node";

export function Grid({ size, isDrawer, currentWord }: GridProps) {
  // Fixed total size for the grid (e.g., 800px)
  const FIXED_GRID_SIZE = 800;

  // Calculate the cell size based on the number of cells to maintain fixed total size
  const cellSize = FIXED_GRID_SIZE / size;

  // Get room information
  const { room } = useRoom();

  // Get drawer word from room state if available
  const drawerWord =
    isDrawer && room?.state?.wordForDrawer
      ? room.state.wordForDrawer
      : currentWord;

  // State for board data - centralized here instead of in individual nodes
  const [boardData, setBoardData] = useState<Array<{ color: string | null }>>(
    Array(size * size).fill({ color: null })
  );

  // State for currently selected color
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);

  // State for tracking if eraser is active
  const [isEraser, setIsEraser] = useState(false);

  // Track if mouse is down (for drawing)
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize grid lines visibility - persist across turns
  const [showGridLines, setShowGridLines] = useState(true);

  // Ref to track the last drawn node (to prevent redundant updates)
  const lastDrawnNodeRef = useRef<number | null>(null);

  // Batch drawing updates to reduce network traffic and improve performance
  const pendingDrawUpdatesRef = useRef<Map<number, string>>(new Map());

  // Tracking mouse position for better line drawing
  const prevMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Add a ref for SVG element to get coordinates
  const svgRef = useRef<SVGSVGElement>(null);

  // Get the effective color based on whether eraser is active
  const effectiveColor = isEraser ? "transparent" : selectedColor;

  // Update board data when room state changes
  useEffect(() => {
    if (!room) return;

    // Initialize board from server state
    const updateBoardFromServer = () => {
      const newBoardData = [...boardData];

      for (let i = 0; i < size * size; i++) {
        if (room.state.board && room.state.board[i]) {
          const nodeColor = room.state.board[i].color;

          // Only set valid colors
          if (
            nodeColor &&
            nodeColor !== "transparent" &&
            nodeColor !== "bg-transparent" &&
            nodeColor !== "undefined"
          ) {
            newBoardData[i] = { color: nodeColor };
          } else {
            newBoardData[i] = { color: null };
          }
        } else {
          newBoardData[i] = { color: null };
        }
      }

      setBoardData(newBoardData);
    };

    // Initial update
    updateBoardFromServer();

    // Listen for state changes
    const stateChangeHandler = () => {
      updateBoardFromServer();
    };

    // Listen for board_cleared event
    const boardClearedHandler = () => {
      setBoardData(Array(size * size).fill({ color: null }));
    };

    // Set up listeners
    room.onStateChange(stateChangeHandler);
    room.onMessage("board_cleared", boardClearedHandler);

    // Cleanup
    return () => {
      // Best effort cleanup
    };
  }, [room, size]);

  // Function to draw at a specific grid position
  const drawAtPosition = (index: number) => {
    // Prevent redundant updates to the same node and prevent flickering
    if (
      lastDrawnNodeRef.current === index &&
      pendingDrawUpdatesRef.current.has(index)
    ) {
      return;
    }

    const newColor = isEraser ? null : effectiveColor;

    // Skip if the cell already has this color to prevent flickering
    if (boardData[index]?.color === newColor) {
      return;
    }

    lastDrawnNodeRef.current = index;

    // Update local state immediately for better responsiveness
    setBoardData((prevBoardData) => {
      const newBoardData = [...prevBoardData];
      newBoardData[index] = { color: newColor };
      return newBoardData;
    });

    // Add to batch update queue instead of sending immediately
    pendingDrawUpdatesRef.current.set(index, effectiveColor);
  };

  // Setup batch sending of drawing updates with better performance
  useEffect(() => {
    if (!room || !isDrawer) return;

    // Function to send batched updates to server
    const sendBatchedUpdates = () => {
      if (pendingDrawUpdatesRef.current.size > 0) {
        const updates = Array.from(pendingDrawUpdatesRef.current.entries()).map(
          ([index, color]) => ({ index, color })
        );

        // Send the batch to the server
        if (room) {
          room.send("draw_batch", updates);
        }

        // Clear the pending updates after sending
        pendingDrawUpdatesRef.current.clear();
      }
    };

    // Use requestAnimationFrame for smoother drawing performance
    let animationFrameId: number;

    const processBatch = () => {
      sendBatchedUpdates();
      animationFrameId = requestAnimationFrame(processBatch);
    };

    // Start the animation frame loop
    animationFrameId = requestAnimationFrame(processBatch);

    // Clean up animation frame on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      sendBatchedUpdates(); // Send any pending updates
    };
  }, [room, isDrawer]);

  // Improve mousedown handling to prevent double-flashing
  const handleCanvasInteraction = (e: React.MouseEvent) => {
    if (
      !isDrawer ||
      !svgRef.current ||
      (!isDrawing && e.type !== "mousedown") ||
      !room || // Make sure we have a room
      room.state.ended // Prevent drawing if game has ended
    ) {
      return;
    }

    // Additional check for time - don't allow drawing if time is very low (<1 second)
    // This prevents drawing right before "time's up" message
    if (room.state.time < 1) {
      return;
    }

    // Get mouse position relative to SVG
    const svgRect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;

    // Calculate grid cell index from mouse position
    const cellX = Math.floor(mouseX / cellSize);
    const cellY = Math.floor(mouseY / cellSize);

    // Ensure we're within bounds
    if (cellX < 0 || cellX >= size || cellY < 0 || cellY >= size) {
      return;
    }

    const index = cellY * size + cellX;

    // If this is a mousedown event, start drawing and set initial position
    if (e.type === "mousedown") {
      e.preventDefault(); // Prevent double events
      setIsDrawing(true);
      prevMousePosRef.current = { x: mouseX, y: mouseY };

      // Draw immediately at this position
      drawAtPosition(index);
      return;
    }

    // For mousemove with improved interpolation
    if (e.type === "mousemove" && isDrawing && prevMousePosRef.current) {
      const { x: prevX, y: prevY } = prevMousePosRef.current;

      // Interpolate between the previous and current position
      // This ensures we fill all cells that the mouse moved through, even if it moved quickly
      const dx = mouseX - prevX;
      const dy = mouseY - prevY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If movement is too small, just draw at current position
      if (distance < cellSize / 3) {
        drawAtPosition(index);
      } else {
        // Improved interpolation with more steps for smoother lines
        const steps = Math.max(Math.ceil(distance / (cellSize / 3)), 2);

        // Use a Set to track unique indices to prevent drawing the same cell multiple times
        const processedIndices = new Set<number>();

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const interpX = prevX + dx * t;
          const interpY = prevY + dy * t;

          const interpCellX = Math.floor(interpX / cellSize);
          const interpCellY = Math.floor(interpY / cellSize);

          if (
            interpCellX >= 0 &&
            interpCellX < size &&
            interpCellY >= 0 &&
            interpCellY < size
          ) {
            const interpIndex = interpCellY * size + interpCellX;

            // Only process each index once to avoid flicker
            if (!processedIndices.has(interpIndex)) {
              processedIndices.add(interpIndex);
              drawAtPosition(interpIndex);
            }
          }
        }
      }

      // Update previous position
      prevMousePosRef.current = { x: mouseX, y: mouseY };
    }
  };

  // Function to clear the grid
  const clearGrid = () => {
    if (isDrawer && room) {
      room.send("clear_board");

      // Also clear locally for immediate feedback
      setBoardData(Array(size * size).fill({ color: null }));

      // Clear pending updates
      pendingDrawUpdatesRef.current.clear();
    }
  };

  // Function to toggle eraser on/off
  const toggleEraser = () => {
    setIsEraser(!isEraser);
  };

  // Function to handle color selection
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setIsEraser(false);
  };

  // Memoize the grid nodes to prevent unnecessary re-renders
  const gridNodes = useMemo(() => {
    return Array.from({ length: size * size }).map((_, index) => {
      const x = (index % size) * cellSize;
      const y = Math.floor(index / size) * cellSize;

      return (
        <Node
          key={index}
          x={x}
          y={y}
          width={cellSize}
          height={cellSize}
          color={boardData[index]?.color || null}
          showGridLines={showGridLines}
          onNodeInteraction={(e) => {}} // No longer used for drawing
        />
      );
    });
  }, [boardData, size, cellSize, showGridLines]);

  // Handle ending drawing
  const endDrawing = () => {
    if (isDrawer) {
      setIsDrawing(false);
      lastDrawnNodeRef.current = null;
      prevMousePosRef.current = null;
    }
  };

  // Make sure the grid toggle state is preserved independently from drawing state
  useEffect(() => {
    // This will run when isDrawer changes, but we intentionally don't
    // reset showGridLines to allow spectators to maintain their preference
  }, [isDrawer]);

  return (
    <div className="flex flex-col">
      {/* Drawing Grid */}
      <div
        className={`relative ${
          isDrawer ? "cursor-crosshair" : "cursor-default"
        }`}
      >
        <svg
          ref={svgRef}
          width={FIXED_GRID_SIZE}
          height={FIXED_GRID_SIZE}
          className="border border-gray-300 bg-white rounded-md shadow-md"
          onMouseDown={isDrawer ? handleCanvasInteraction : undefined}
          onMouseMove={isDrawer ? handleCanvasInteraction : undefined}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
        >
          {gridNodes}
        </svg>
      </div>

      {/* Info and Controls */}
      <div className="mt-3 mb-4 z-10 relative">
        {/* Grid Info */}
        <div className="text-sm text-gray-500 mb-3 z-10">
          Grid size: {size}x{size} • Cell size: {cellSize.toFixed(1)}px
        </div>

        {/* Controls Row - Drawing tools only for drawer, grid toggle for everyone */}
        <div className="flex items-center justify-between w-full max-w-[800px] z-10">
          {/* Color Palette - Only for drawer */}
          {isDrawer && (
            <div className="flex gap-3 flex-wrap flex-1 mr-4 z-10">
              {colorOptions.map((color) => (
                <div key={color} className="relative">
                  <button
                    className={`w-10 h-10 rounded-full transition-all duration-300 z-10 ${
                      selectedColor === color && !isEraser
                        ? "scale-125 transform-gpu"
                        : "hover:scale-110"
                    }`}
                    style={{
                      backgroundColor: color,
                      boxShadow:
                        selectedColor === color && !isEraser
                          ? "0 0 12px rgba(0, 0, 0, 0.6)"
                          : "none",
                      outline:
                        selectedColor === color && !isEraser
                          ? "2px solid white"
                          : "none",
                    }}
                    onClick={() => handleColorSelect(color)}
                    title={color}
                  />
                  {selectedColor === color && !isEraser && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-30"
                      style={{
                        backgroundColor: color,
                      }}
                    ></div>
                  )}
                </div>
              ))}

              {/* Eraser Tool */}
              <div className="relative z-10">
                <button
                  className={`w-10 h-10 rounded-full transition-all duration-300 z-10 flex items-center justify-center bg-white ${
                    isEraser ? "scale-125 transform-gpu" : "hover:scale-110"
                  }`}
                  style={{
                    border: "1px solid #ccc",
                    boxShadow: isEraser
                      ? "0 0 12px rgba(0, 0, 0, 0.6)"
                      : "none",
                    outline: isEraser ? "1px solid white" : "none",
                  }}
                  onClick={toggleEraser}
                  title="Eraser"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
                {isEraser && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-30"
                    style={{
                      backgroundColor: "#aaaaaa",
                    }}
                  ></div>
                )}
              </div>
            </div>
          )}

          {/* Toggle and Clear Button */}
          <div className="flex items-center gap-3 z-10">
            {/* Grid Toggle - Available to everyone */}
            <label className="flex items-center cursor-pointer bg-gray-700 px-3 py-2 rounded-md">
              <span className="mr-2 text-sm font-medium text-white">Grid</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={showGridLines}
                  onChange={() => setShowGridLines(!showGridLines)}
                />
                <div
                  className={`block w-10 h-6 rounded-full ${
                    showGridLines ? "bg-blue-500" : "bg-gray-400"
                  }`}
                ></div>
                <div
                  className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all duration-200 ${
                    showGridLines ? "transform translate-x-4" : ""
                  }`}
                ></div>
              </div>
            </label>

            {/* Clear Button - Only for drawer */}
            {isDrawer && (
              <button
                onClick={clearGrid}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Message for non-drawing players */}
        {!isDrawer && (
          <div className="text-center text-gray-400 italic absolute inset-0 flex items-center justify-center mt-8">
            <span className="bg-gray-800 px-3 py-1.5 rounded text-sm">
              Waiting for your turn to draw...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
