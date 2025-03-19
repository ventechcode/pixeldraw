"use client";

import { cn } from "@/lib/utils";
import { motion, type MotionProps } from "framer-motion";
import type React from "react";

interface LineShadowTextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps>,
    MotionProps {
  shadowColor?: string;
  as?: React.ElementType;
}

export function LineShadowText({
  children,
  shadowColor = "black",
  className,
  as: Component = "span",
  ...props
}: LineShadowTextProps) {
  const MotionComponent = motion(Component as any);
  const content = typeof children === "string" ? children : null;

  if (!content) {
    throw new Error("LineShadowText only accepts string content");
  }

  return (
    <MotionComponent
      style={
        {
          "--shadow-color": shadowColor,
          position: "relative",
          zIndex: 0,
          display: "inline-flex",
        } as React.CSSProperties
      }
      className={cn(className)}
      data-text={content}
      {...props}
    >
      {content}
      <span
        style={{
          position: "absolute",
          left: "0.07em",
          top: "0.07em",
          zIndex: -10,
          backgroundImage: `linear-gradient(45deg, transparent 45%, ${shadowColor} 45%, ${shadowColor} 55%, transparent 0)`,
          backgroundSize: "0.06em 0.06em",
          backgroundClip: "text",
          color: "transparent",
          animation: "lineShadowMove 44s linear infinite",
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <style jsx>{`
        @keyframes lineShadowMove {
          0%,
          100% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
        }
      `}</style>
    </MotionComponent>
  );
}
