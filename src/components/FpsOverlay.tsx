"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Overlay de FPS para validar o critério de sucesso de 60 FPS.
 * Usa o próprio requestAnimationFrame; não depende do loop do caleidoscópio.
 */
export function FpsOverlay() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      if (!last.current) last.current = t;
      frames.current += 1;
      const elapsed = t - last.current;
      if (elapsed >= 500) {
        setFps(Math.round((frames.current * 1000) / elapsed));
        frames.current = 0;
        last.current = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-2 right-2 z-50 rounded bg-black/60 px-2 py-1 font-mono text-xs text-emerald-400">
      {fps} FPS
    </div>
  );
}
