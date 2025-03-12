import { useEffect } from "react";

export default function GuessingNode({
  className,
  color,
}: {
  className: string;
  color: string;
}) {
  useEffect(() => {}, [color]);

  return (
    <button
      className={`${className} ${
        color != "bg-transparent"
          ? "border-0 border-t-0 " + color
          : "border bg-transparent"
      }`}
    />
  );
}
