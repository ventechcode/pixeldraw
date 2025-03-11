import { useRoom } from "@/hooks/useRoom";
import { useEffect, useState } from "react";

export default function GuessingNode({
  className,
  color,
}: {
  className: string;
  color: string;
}) {
  useEffect(() => {}, [color]);

  return <button className={`${className} ${color} border`} />;
}
