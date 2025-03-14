import DrawingNode from "./DrawingNode";

export default function DrawingBoard({ size }: { size: number }) {
  const drawingColor = "bg-black";

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
      className="grid border h-full w-full"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: size * size }).map((_, i) => (
        <DrawingNode
          key={i}
          drawingColor="bg-black"
          className={`${drawingColor} ${nodeSize}`}
          index={i}
        />
      ))}
    </div>
  );
}
