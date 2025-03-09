import { useEffect, useState } from "react";

export default function Node({ className }: { className: string }) {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (hovered && clicked) {
      setActive(true);
    }
  }, [hovered, clicked]);

  return (
    <button
      className={`${className} ${!active ? "bg-transparent" : ""}`}
      onMouseDown={() => setClicked(true)}
      onMouseEnter={() => setHovered(true)}
    />
  );
}
