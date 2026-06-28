import type { PixelShader } from "@/patterns/procedural/proceduralSource";

const TAU = Math.PI * 2;

/** Espiral colorida — feed mais "frenético" e energético. */
export const spiral: PixelShader = (u, v) => {
  const x = u - 0.5;
  const y = v - 0.5;
  const a = Math.atan2(y, x);
  const r = Math.hypot(x, y);
  const phase = a * 6 + r * 40;
  return [
    128 + 127 * Math.sin(phase),
    128 + 127 * Math.sin(phase + TAU / 3),
    128 + 127 * Math.sin(phase + (2 * TAU) / 3),
  ];
};

/** Grade/xadrez suave — feed mais geométrico e estável. */
export const grid: PixelShader = (u, v) => {
  const gx = Math.sin(u * Math.PI * 8);
  const gy = Math.sin(v * Math.PI * 8);
  const c = gx * gy;
  return [128 + 127 * c, 128 + 127 * (1 - Math.abs(c)), 60 + 195 * Math.abs(c)];
};

/** Anéis concêntricos — feed mais suave e centrado. */
export const rings: PixelShader = (u, v) => {
  const r = Math.hypot(u - 0.5, v - 0.5);
  const phase = r * 60;
  return [
    60 + 195 * (0.5 + 0.5 * Math.sin(phase)),
    40 + 160 * (0.5 + 0.5 * Math.sin(phase + 2)),
    90 + 165 * (0.5 + 0.5 * Math.sin(phase + 4)),
  ];
};
