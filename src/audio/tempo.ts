import type { BeatGrid } from "@/lib/types";

/**
 * Detecção de andamento (BPM) e grade de beats — puro, zero-dependência.
 *
 * Pipeline: mixdown mono → low-pass (~200 Hz, isola o kick) → envoltória de
 * onset (fluxo de energia retificado) → autocorrelação na faixa de BPM alvo →
 * período do beat. A âncora de fase é o primeiro onset forte. Para música
 * eletrônica (andamento estável), uma grade de tempo constante é suficiente e
 * bate com o modelo de beat grid de software de DJ.
 */

/** Subconjunto do AudioBuffer de que a análise precisa (facilita testes). */
export interface PcmLike {
  readonly sampleRate: number;
  readonly length: number;
  readonly numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
}

export interface TempoOptions {
  /** Menor BPM considerado (default 70). */
  minBpm?: number;
  /** Maior BPM considerado (default 185). */
  maxBpm?: number;
  /** Resolução da envoltória de onset, em segundos por amostra (default 0.01). */
  hopSec?: number;
}

export interface TempoResult {
  bpm: number;
  anchorSec: number;
  confidence: number;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Envoltória de onset (fluxo de energia de graves, retificado, 0..1). */
function onsetEnvelope(buffer: PcmLike, hop: number): Float32Array {
  const sr = buffer.sampleRate;
  const n = buffer.length;
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;

  // Low-pass one-pole (~200 Hz) para enfatizar o kick.
  const rc = 1 / (2 * Math.PI * 200);
  const dt = 1 / sr;
  const alpha = dt / (rc + dt);

  const frames = Math.floor(n / hop);
  const energy = new Float32Array(frames);
  let lp = 0;
  for (let f = 0; f < frames; f++) {
    const start = f * hop;
    let acc = 0;
    for (let i = 0; i < hop; i++) {
      const idx = start + i;
      const s = ch1 ? (ch0[idx] + ch1[idx]) * 0.5 : ch0[idx];
      lp += alpha * (s - lp);
      acc += lp * lp;
    }
    energy[f] = Math.sqrt(acc / hop);
  }

  // Onset = diferença positiva (fluxo crescente) entre janelas.
  const env = new Float32Array(frames);
  let max = 0;
  for (let f = 1; f < frames; f++) {
    const d = energy[f] - energy[f - 1];
    const v = d > 0 ? d : 0;
    env[f] = v;
    if (v > max) max = v;
  }
  if (max > 0) for (let f = 0; f < frames; f++) env[f] /= max;
  return env;
}

/** Primeiro onset que cruza o limiar → fixa a fase da grade. */
function firstOnset(env: Float32Array, envRate: number, threshold = 0.5): number {
  for (let f = 0; f < env.length; f++) if (env[f] >= threshold) return f / envRate;
  return 0;
}

/**
 * Estima BPM, âncora de fase e confiança a partir do PCM.
 * Retorna bpm=0 (confiança 0) quando o sinal é curto/silencioso demais.
 */
export function detectTempo(buffer: PcmLike, opts: TempoOptions = {}): TempoResult {
  const minBpm = opts.minBpm ?? 70;
  const maxBpm = opts.maxBpm ?? 185;
  const hopSec = opts.hopSec ?? 0.01;
  const sr = buffer.sampleRate;
  const hop = Math.max(1, Math.round(sr * hopSec));
  const envRate = sr / hop;

  const env = onsetEnvelope(buffer, hop);
  if (env.length < 8) return { bpm: 0, anchorSec: 0, confidence: 0 };

  // Centraliza na média para a autocorrelação medir só a periodicidade.
  let mean = 0;
  for (let f = 0; f < env.length; f++) mean += env[f];
  mean /= env.length;
  const centered = new Float32Array(env.length);
  for (let f = 0; f < env.length; f++) centered[f] = env[f] - mean;

  const lagMin = Math.max(1, Math.floor((60 / maxBpm) * envRate));
  const lagMax = Math.min(env.length - 1, Math.ceil((60 / minBpm) * envRate));
  if (lagMax <= lagMin) return { bpm: 0, anchorSec: 0, confidence: 0 };

  const scores = new Float32Array(lagMax + 1);
  let bestLag = lagMin;
  let bestScore = -Infinity;
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let acc = 0;
    for (let i = 0; i + lag < centered.length; i++) acc += centered[i] * centered[i + lag];
    acc /= centered.length - lag; // normaliza pela sobreposição
    scores[lag] = acc;
    if (acc > bestScore) {
      bestScore = acc;
      bestLag = lag;
    }
  }

  // Interpolação parabólica para BPM sub-amostra.
  let refinedLag = bestLag;
  if (bestLag > lagMin && bestLag < lagMax) {
    const y0 = scores[bestLag - 1];
    const y1 = scores[bestLag];
    const y2 = scores[bestLag + 1];
    const denom = y0 - 2 * y1 + y2;
    if (denom !== 0) {
      const delta = (0.5 * (y0 - y2)) / denom;
      if (delta > -1 && delta < 1) refinedLag = bestLag + delta;
    }
  }

  const periodSec = refinedLag / envRate;
  const bpm = Math.round((60 / periodSec) * 10) / 10;

  // Confiança = pico de autocorrelação normalizado pela variância (lag 0).
  // Sinal perfeitamente periódico → ~1; silêncio/ruído → ~0. Limitado a 0..1.
  let variance = 0;
  for (let i = 0; i < centered.length; i++) variance += centered[i] * centered[i];
  variance /= centered.length;
  const confidence = variance > 0 ? clamp01(bestScore / variance) : 0;
  const anchorSec = firstOnset(env, envRate);
  return { bpm, anchorSec, confidence };
}

/** Constrói a grade (tempo constante) a partir de BPM + âncora de fase. */
export function createBeatGrid(
  bpm: number,
  anchorSec: number,
  confidence: number,
  beatsPerBar = 4,
): BeatGrid {
  const period = bpm > 0 ? 60 / bpm : 0;
  return {
    bpm,
    anchorSec,
    confidence,
    beatsPerBar,
    beatAt: (index) => anchorSec + index * period,
    beatIndexAt: (timeSec) => (period > 0 ? Math.round((timeSec - anchorSec) / period) : 0),
    nearestBeat: (timeSec) =>
      period > 0 ? anchorSec + Math.round((timeSec - anchorSec) / period) * period : anchorSec,
    isDownbeat: (index) => ((index % beatsPerBar) + beatsPerBar) % beatsPerBar === 0,
  };
}

/** Atalho: detecta o andamento e devolve a grade pronta. */
export function analyzeBeatGrid(buffer: PcmLike, opts?: TempoOptions): BeatGrid {
  const { bpm, anchorSec, confidence } = detectTempo(buffer, opts);
  return createBeatGrid(bpm, anchorSec, confidence);
}
