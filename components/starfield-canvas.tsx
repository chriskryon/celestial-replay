"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; z: number };

export function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const stars: Star[] = Array.from({ length: window.innerWidth < 760 ? 300 : 820 }, () => ({
      x: Math.random() * 5 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random() + 0.08,
    }));
    let frame = 0;
    let previous = performance.now();

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      const elapsed = Math.min(time - previous, 32);
      previous = time;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const star of stars) {
        star.z -= elapsed * 0.000042;
        if (star.z <= 0.025) {
          star.x = Math.random() * 2 - 1;
          star.y = Math.random() * 2 - 1;
          star.z = 1;
        }
        const x = window.innerWidth / 2 + (star.x / star.z) * window.innerWidth * 0.45;
        const y = window.innerHeight / 2 + (star.y / star.z) * window.innerHeight * 0.45;
        if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) continue;
        const opacity = Math.min(0.82, 0.18 + (1 - star.z) * 0.64);
        const size = star.z < 0.24 ? 2 : star.z < 0.52 ? 1.25 : 0.8;
        context.fillStyle = `rgba(220, 231, 255, ${opacity})`;
        context.fillRect(x, y, size, size);
      }
      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
