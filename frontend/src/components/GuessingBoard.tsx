"use client";

import { useRoom } from "@/hooks/useRoom";
import GuessingNode from "./GuessingNode";
import { useEffect, useState } from "react";
import { getStateCallbacks } from "colyseus.js";

export default function GuessingBoard({ size }: { size: number }) {
  const [board, setBoard] = useState<any>([]);

  const { room } = useRoom();

  useEffect(() => {
    if (room) {
      setBoard([...room.state.board]);

      const $ = getStateCallbacks(room!);

      $(room.state).board.onChange((node: any, index: number) => {
        setBoard([...room.state.board]); // Create a new array reference
      });
    }
  }, [room]);

  const nodeSize =
    size === 16
      ? "size-8 md:size-6"
      : size === 32
      ? "size-4 md:size-6"
      : size === 64
      ? "size-4 md:size-3"
      : "size-1 md:size-2";

  return (
    <div
      className="grid border"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
      }}
    >
      {board.map((node: any) => (
        <GuessingNode
          key={node.index}
          className={`${nodeSize}`}
          color={node.color}
        />
      ))}
    </div>
  );
}
