import { useRoom } from "@/hooks/useRoom";
import { useEffect, useState } from "react";

interface NodeProps {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  selectedColor?: string;
  isDrawing?: boolean;
  showGridLines?: boolean;
  forceReset?: boolean;
}

export default function Node({
  index,
  x,
  y,
  width,
  height,
  selectedColor = "#000000",
  isDrawing = false,
  showGridLines = true,
  forceReset = false,
}: NodeProps) {
  const [color, setColor] = useState<string | null>(null);
  const { room } = useRoom();

  // Check if the current user is the drawer
  const isDrawer = room?.sessionId === room?.state.drawerSessionId;

  // Reset color when forceReset changes
  useEffect(() => {
    if (forceReset) {
      setColor(null);
    }
  }, [forceReset]);

  // Listen for board state changes and board_cleared events
  useEffect(() => {
    if (!room) return;

    // Function to check board state
    const checkBoardState = () => {
      // Check if this node exists in the board state
      if (room.state.board && room.state.board[index]) {
        const nodeColor = room.state.board[index].color;

        // Only set valid colors
        if (
          nodeColor &&
          nodeColor !== "transparent" &&
          nodeColor !== "bg-transparent" &&
          nodeColor !== "undefined"
        ) {
          setColor(nodeColor);
        } else {
          setColor(null);
        }
      } else {
        setColor(null);
      }
    };

    // Check initial state
    checkBoardState();

    // Set up listeners
    room.onStateChange(checkBoardState);

    // No need for explicit cleanup - React will handle it
  }, [room, index]);

  // Direct handlers for mouse events
  const handleMouseDown = () => {
    if (isDrawer) {
      // For eraser (transparent), set color to null
      if (selectedColor === "transparent") {
        setColor(null);
      } else {
        // Apply color locally
        setColor(selectedColor);
      }

      // Send draw command to server
      if (room) {
        room.send("draw", { color: selectedColor, index });
      }
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (e.buttons === 1 && isDrawing && isDrawer) {
      // For eraser (transparent), set color to null
      if (selectedColor === "transparent") {
        setColor(null);
      } else {
        // Apply color locally
        setColor(selectedColor);
      }

      // Send draw command to server
      if (room) {
        room.send("draw", { color: selectedColor, index });
      }
    }
  };

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={color || "white"}
      stroke={showGridLines && !color ? "rgba(128, 128, 128, 0.3)" : "none"}
      strokeWidth={showGridLines && !color ? 1 : 0}
      className={`transition-colors duration-75 ${
        isDrawer ? "cursor-crosshair" : "cursor-default"
      }`}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
    />
  );
}
