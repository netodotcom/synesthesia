import type { FreqBands } from "@/lib/types";

/** Intervalo de frequência em Hz, [start, end). */
export type BandRange = readonly [number, number];

export interface BandRanges {
  sub: BandRange;
  low: BandRange;
  mid: BandRange;
  high: BandRange;
}

/** Bandas contíguas (a borda de uma é o início da próxima → sem sobreposição). */
export const DEFAULT_BANDS: BandRanges = {
  sub: [20, 120],
  low: [120, 500],
  mid: [500, 2000],
  high: [2000, 16000],
};

/** Média normalizada (0..1) das magnitudes do FFT entre dois limites em Hz. */
function averageBand(
  freq: Uint8Array,
  startHz: number,
  endHz: number,
  hzPerBin: number,
): number {
  const binCount = freq.length;
  const startBin = Math.max(0, Math.floor(startHz / hzPerBin));
  const endBin = Math.min(binCount, Math.floor(endHz / hzPerBin));
  if (endBin <= startBin) return 0;
  let sum = 0;
  for (let i = startBin; i < endBin; i++) sum += freq[i];
  return sum / (endBin - startBin) / 255;
}

/**
 * Fatia o FFT em bandas sub/low/mid/high (cada uma normalizada 0..1).
 * Passe `out` para reusar o objeto e evitar alocação no hot path.
 */
export function computeBands(
  freq: Uint8Array,
  sampleRate: number,
  ranges: BandRanges = DEFAULT_BANDS,
  out?: FreqBands,
): FreqBands {
  const nyquist = sampleRate / 2;
  const hzPerBin = nyquist / freq.length;
  const target = out ?? { sub: 0, low: 0, mid: 0, high: 0 };
  target.sub = averageBand(freq, ranges.sub[0], ranges.sub[1], hzPerBin);
  target.low = averageBand(freq, ranges.low[0], ranges.low[1], hzPerBin);
  target.mid = averageBand(freq, ranges.mid[0], ranges.mid[1], hzPerBin);
  target.high = averageBand(freq, ranges.high[0], ranges.high[1], hzPerBin);
  return target;
}

/** Energia global aproximada (média de todas as bins, 0..1). */
export function computeLevel(freq: Uint8Array): number {
  if (freq.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < freq.length; i++) sum += freq[i];
  return sum / freq.length / 255;
}
