import Node from "./Node";

export default function GameBoard({ size }: { size: number }) {
  const drawingColor = "bg-black";

  return (
    <div
      className="grid border rounded-md border-black p-0.5"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: size * size }).map((_, i) => (
        <Node
          key={i}
          className={`${drawingColor} ${
            i % size == 0 ? "border-l-0" : "border-l"
          } ${i < size * (size - 1) ? "border-b" : "border-b-0"} ${
            size === 32 ? "size-6" : size === 64 ? "size-3" : "size-2"
          } ${i === 0 ? "" : ""}`}
        />
      ))}
    </div>
  );
}
