"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  a: number;
  life: number;
}

export function triggerConfetti(count = 90) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("tahsili:confetti", { detail: { count } })
  );
}

export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const cx = cv.getContext("2d");
    if (!cx) return;

    let parts: Particle[] = [];
    let raf = 0;

    const fit = () => {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    };
    fit();
    window.addEventListener("resize", fit);

    const loop = () => {
      cx.clearRect(0, 0, cv.width, cv.height);
      parts = parts.filter((p) => p.life-- > 0 && p.y < cv.height + 20);
      for (const p of parts) {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.a += 0.2;
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(p.a);
        cx.fillStyle = p.c;
        cx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        cx.restore();
      }
      if (parts.length > 0) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
        cx.clearRect(0, 0, cv.width, cv.height);
      }
    };

    const onConfetti = (e: Event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const custom = e as CustomEvent<{ count?: number }>;
      const count = custom.detail?.count ?? 90;
      const cols = ["#F4845F", "#3AAFA9", "#0B4F6C", "#F5B83D", "#FFFFFF"];
      for (let i = 0; i < count; i++) {
        parts.push({
          x: window.innerWidth / 2 + (Math.random() - 0.5) * window.innerWidth * 0.5,
          y: window.innerHeight * 0.35,
          vx: (Math.random() - 0.5) * 12,
          vy: -Math.random() * 12 - 4,
          r: Math.random() * 6 + 4,
          c: cols[i % cols.length],
          a: Math.random() * 6,
          life: 120,
        });
      }
      if (!raf) {
        raf = requestAnimationFrame(loop);
      }
    };

    window.addEventListener("tahsili:confetti", onConfetti);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("tahsili:confetti", onConfetti);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    />
  );
}
