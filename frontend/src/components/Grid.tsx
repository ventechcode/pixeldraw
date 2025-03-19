"use client";

import { useState, useEffect } from "react";
import Node from "./Node";
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

export function Grid({ size, isDrawer, currentWord }: GridProps) {
  // Fixed total size for the grid (e.g., 800px)
  const FIXED_GRID_SIZE = 800;

  // Calculate the cell size based on the number of cells to maintain fixed total size
  const cellSize = FIXED_GRID_SIZE / size;

  // State for currently selected color
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);

  // State for tracking if eraser is active
  const [isEraser, setIsEraser] = useState(false);

  // Track if mouse is down (for drawing)
  const [isDrawing, setIsDrawing] = useState(false);

  // Toggle for grid lines visibility
  const [showGridLines, setShowGridLines] = useState(true);

  // State to force reset after clear
  const [forceReset, setForceReset] = useState(false);

  // Get room information
  const { room } = useRoom();

  // Function to clear the grid
  const clearGrid = () => {
    if (isDrawer && room) {
      console.log("Sending clear_board command to server");

      // Send clear command to server
      room.send("clear_board");

      // Force reset locally
      setForceReset(true);

      // Turn off reset flag after a delay
      setTimeout(() => {
        setForceReset(false);
      }, 100);
    }
  };

  // Listen for board_cleared event from server
  useEffect(() => {
    if (!room) return;

    // Handle board cleared event
    const handleBoardCleared = () => {
      console.log("Received board_cleared event");

      // Force local reset
      setForceReset(true);

      // Turn off reset flag after a delay
      setTimeout(() => {
        setForceReset(false);
      }, 100);
    };

    // Set up listener
    room.onMessage("board_cleared", handleBoardCleared);

    // Clean up on unmount
    return () => {
      // Best effort cleanup
    };
  }, [room]);

  // Function to toggle eraser on/off
  const toggleEraser = () => {
    setIsEraser(!isEraser);
  };

  // Get the effective color based on whether eraser is active
  const effectiveColor = isEraser ? "transparent" : selectedColor;

  // Function to handle color selection
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setIsEraser(false);
  };

  return (
    <div className="flex flex-col">
      {/* Drawing Grid */}
      <div
        className={`relative ${
          isDrawer ? "cursor-crosshair" : "cursor-default"
        }`}
        onMouseDown={() => isDrawer && setIsDrawing(true)}
        onMouseUp={() => isDrawer && setIsDrawing(false)}
        onMouseLeave={() => isDrawer && setIsDrawing(false)}
      >
        <svg
          width={FIXED_GRID_SIZE}
          height={FIXED_GRID_SIZE}
          className="border border-gray-300 bg-white"
        >
          {Array.from({ length: size * size }).map((_, index) => {
            const x = (index % size) * cellSize;
            const y = Math.floor(index / size) * cellSize;
            return (
              <Node
                key={index}
                index={index}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                selectedColor={effectiveColor}
                isDrawing={isDrawing}
                showGridLines={showGridLines}
                forceReset={forceReset}
              />
            );
          })}
        </svg>
      </div>

      {/* Info and Controls - only shown to drawer */}
      <div className="mt-3 mb-4 z-10 relative">
        {/* Grid Info */}
        <div className="text-sm text-gray-500 mb-3 z-10">
          Grid size: {size}x{size} • Cell size: {cellSize.toFixed(1)}px
        </div>

        {/* Controls Row - Only visible to drawer */}
        {isDrawer && (
          <div className="flex items-center justify-between w-full max-w-[800px] z-10">
            {/* Color Palette */}
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

            {/* Toggle and Clear Button */}
            <div className="flex items-center gap-3 z-10">
              <label className="flex items-center cursor-pointer bg-gray-700 px-3 py-2 rounded-md">
                <span className="mr-2 text-sm font-medium text-white">
                  Grid
                </span>
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
              <button
                onClick={clearGrid}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Message for non-drawing players */}
        {!isDrawer && (
          <div className="text-center text-gray-500 italic mt-8">
            Waiting for your turn to draw...
          </div>
        )}
      </div>
    </div>
  );
}
