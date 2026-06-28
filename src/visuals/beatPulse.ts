import type { BeatGrid } from "@/lib/types";

/**
 * Envelope do pulso travado no beat grid (M10).
 * Função pura sobre a grade → testável em node, sem WebGL.
 */
export interface BeatPulse {
  /** 1.0 em cima de qualquer beat, decaindo a ~0 antes do próximo. */
  beatPulse: number;
  /** Igual ao beatPulse, porém só quando o beat mais próximo é downbeat (4/4). */
  downbeatPulse: number;
}

const NO_PULSE: BeatPulse = { beatPulse: 0, downbeatPulse: 0 };

/**
 * Quão rápido o pulso decai entre dois beats. Maior = mais "seco"/percussivo.
 * Com 6, no ponto mais distante (meio do intervalo, dist = período/2) o valor
 * cai para e^-3 ≈ 0.05 — praticamente zero antes do beat seguinte.
 */
const DECAY = 6;

/**
 * Amostra o envelope de pulso da grade em `timeSec`.
 *
 * A fase é a distância (s) ao beat mais próximo (via grid.beatIndexAt/beatAt);
 * em cima do beat a distância é 0 → pulso 1.0; no meio do intervalo a distância
 * é período/2 → pulso ~0. O decaimento é exponencial e simétrico em torno do beat.
 *
 * `downbeatPulse` só dispara quando o beat mais próximo é o downbeat do compasso.
 *
 * Robusto a grade inválida (bpm <= 0) e a valores não finitos → {0, 0}.
 */
export function beatPulseAt(grid: BeatGrid, timeSec: number): BeatPulse {
  if (!grid || !(grid.bpm > 0) || !Number.isFinite(timeSec)) return { ...NO_PULSE };

  const period = 60 / grid.bpm;
  if (!(period > 0) || !Number.isFinite(period)) return { ...NO_PULSE };

  const index = grid.beatIndexAt(timeSec);
  const dist = Math.abs(timeSec - grid.beatAt(index));

  const beatPulse = Math.exp((-DECAY * dist) / period);
  const downbeatPulse = grid.isDownbeat(index) ? beatPulse : 0;

  return { beatPulse, downbeatPulse };
}
