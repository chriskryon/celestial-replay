"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; z: number };
type Meteor = { x: number; y: number; vx: number; vy: number; born: number };

const METEOR_LIFE_MS = 750;

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
    // boost acelera as estrelas (play), wave acende o céu (repetição concluída); ambos decaem sozinhos.
    let boost = 0;
    let wave = 0;
    let meteor: Meteor | null = null;
    let nextMeteorAt = previous + 6000 + Math.random() * 6000;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const onWarp = () => { boost = 1; };
    const onPulse = () => { wave = 1; boost = Math.max(boost, 0.3); };
    const onPointerMove = (event: PointerEvent) => {
      pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const draw = (time: number) => {
      const elapsed = Math.min(time - previous, 32);
      previous = time;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      boost *= Math.exp(-elapsed / 700);
      wave *= Math.exp(-elapsed / 900);
      pointer.x += (pointer.targetX - pointer.x) * 0.05;
      pointer.y += (pointer.targetY - pointer.y) * 0.05;
      const speed = elapsed * 0.000042 * (1 + boost * 14);
      const brightness = 1 + wave * 0.7;

      for (const star of stars) {
        star.z -= speed;
        if (star.z <= 0.025) {
          star.x = Math.random() * 2 - 1;
          star.y = Math.random() * 2 - 1;
          star.z = 1;
        }
        const depth = 1 - star.z;
        const x = window.innerWidth / 2 + (star.x / star.z) * window.innerWidth * 0.45 + pointer.x * depth * 16;
        const y = window.innerHeight / 2 + (star.y / star.z) * window.innerHeight * 0.45 + pointer.y * depth * 10;
        if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) continue;
        const opacity = Math.min(1, (0.18 + depth * 0.64) * brightness);
        const size = star.z < 0.24 ? 2 : star.z < 0.52 ? 1.25 : 0.8;
        context.fillStyle = `rgba(220, 231, 255, ${Math.min(opacity, 0.9)})`;
        context.fillRect(x, y, size, size);
      }

      if (!meteor && time >= nextMeteorAt) {
        const angle = Math.PI * (0.62 + Math.random() * 0.12);
        meteor = {
          x: window.innerWidth * (0.25 + Math.random() * 0.7),
          y: window.innerHeight * Math.random() * 0.35,
          vx: Math.cos(angle) * 0.9,
          vy: Math.sin(angle) * 0.9,
          born: time,
        };
      }
      if (meteor) {
        const age = time - meteor.born;
        if (age > METEOR_LIFE_MS) {
          meteor = null;
          nextMeteorAt = time + 9000 + Math.random() * 9000;
        } else {
          const head = { x: meteor.x + meteor.vx * age, y: meteor.y + meteor.vy * age };
          const tail = { x: head.x - meteor.vx * 140, y: head.y - meteor.vy * 140 };
          const fade = 1 - age / METEOR_LIFE_MS;
          const trail = context.createLinearGradient(head.x, head.y, tail.x, tail.y);
          trail.addColorStop(0, `rgba(235, 242, 255, ${0.85 * fade})`);
          trail.addColorStop(1, "rgba(235, 242, 255, 0)");
          context.strokeStyle = trail;
          context.lineWidth = 1.4;
          context.beginPath();
          context.moveTo(head.x, head.y);
          context.lineTo(tail.x, tail.y);
          context.stroke();
        }
      }
      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("celestial:warp", onWarp);
    window.addEventListener("celestial:pulse", onPulse);
    if (hasFinePointer) window.addEventListener("pointermove", onPointerMove, { passive: true });
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("celestial:warp", onWarp);
      window.removeEventListener("celestial:pulse", onPulse);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
