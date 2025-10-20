"use client";

import { useState, useEffect } from "react";

export default function GlowEffect() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    globalThis.addEventListener("mousemove", handleMouseMove);

    return () => {
      globalThis.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--mouse-x",
      `${mousePosition.x}px`
    );
    document.documentElement.style.setProperty(
      "--mouse-y",
      `${mousePosition.y}px`
    );
  }, [mousePosition]);

  return <div className="glow-effect" />;
}
