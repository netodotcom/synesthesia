import type { WaveformPeaks } from "@/lib/types";

/**
 * Reduz o PCM completo a picos min/max por bucket — a "forma" da faixa para a
 * waveform. Puro e zero-dependência; o canvas só projeta o resultado.
 */

/** Subconjunto do AudioBuffer de que a extração precisa (facilita testes). */
export interface PcmSource {
  readonly length: number;
  readonly numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
}

/**
 * Calcula `buckets` colunas de picos (min/max) a partir do buffer, fazendo
 * mixdown mono dos dois primeiros canais. O nº de buckets é limitado ao nº de
 * amostras (não há como ter mais colunas que amostras).
 */
export function computePeaks(buffer: PcmSource, buckets: number): WaveformPeaks {
  const n = buffer.length;
  const count = Math.max(1, Math.min(Math.floor(buckets), n || 1));
  const min = new Float32Array(count);
  const max = new Float32Array(count);

  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  const perBucket = n / count;

  for (let b = 0; b < count; b++) {
    const start = Math.floor(b * perBucket);
    const end = Math.min(n, Math.floor((b + 1) * perBucket));
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = start; i < end; i++) {
      const s = ch1 ? (ch0[i] + ch1[i]) * 0.5 : ch0[i];
      if (s < lo) lo = s;
      if (s > hi) hi = s;
    }
    if (lo === Infinity) {
      lo = 0;
      hi = 0;
    }
    min[b] = lo;
    max[b] = hi;
  }

  return { length: count, min, max };
}
