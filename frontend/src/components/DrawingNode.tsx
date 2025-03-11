import { useRoom } from "@/hooks/useRoom";
import { useEffect, useState } from "react";

export default function DrawingNode({
  className,
  drawingColor,
  index,
}: {
  className: string;
  drawingColor: string;
  index: number;
}) {
  const [active, setActive] = useState(false);
  const { room } = useRoom();

  useEffect(() => {
    if (room) {
      if (active) {
        room.send("draw", { color: drawingColor, index });
      }
    }
  }, [active]);

  return (
    <button
      className={`${className} ${
        active ? "border-0 border-t-0 " + drawingColor : "border bg-transparent"
      }`}
      // Activate the node immediately on mousedown
      onMouseDown={() => setActive(true)}
      // When the mouse enters, check if the left button is still pressed (e.buttons === 1)
      onMouseEnter={(e) => {
        if (e.buttons === 1) {
          setActive(true);
        }
      }}
    />
  );
}
