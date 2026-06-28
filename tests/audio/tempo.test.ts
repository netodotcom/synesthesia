import { describe, it, expect } from "vitest";
import { detectTempo, createBeatGrid, analyzeBeatGrid, type PcmLike } from "@/audio/tempo";

/**
 * Sintetiza uma faixa de kicks: um burst senoidal de 60 Hz (decaindo) a cada
 * beat. Imita o 4-on-the-floor que a detecção precisa achar.
 */
function kickTrack(bpm: number, durationSec: number, sampleRate = 44100): PcmLike {
  const len = Math.floor(durationSec * sampleRate);
  const data = new Float32Array(len);
  const period = 60 / bpm;
  const burst = Math.floor(0.04 * sampleRate);
  for (let t = 0; t < durationSec; t += period) {
    const start = Math.floor(t * sampleRate);
    for (let i = 0; i < burst && start + i < len; i++) {
      const decay = Math.exp(-i / (burst * 0.3));
      data[start + i] += Math.sin(2 * Math.PI * 60 * (i / sampleRate)) * decay;
    }
  }
  return { sampleRate, length: len, numberOfChannels: 1, getChannelData: () => data };
}

const silence = (durationSec: number, sampleRate = 44100): PcmLike => {
  const data = new Float32Array(Math.floor(durationSec * sampleRate));
  return { sampleRate, length: data.length, numberOfChannels: 1, getChannelData: () => data };
};

describe("detectTempo", () => {
  it("detecta 120 BPM dentro de ±2", () => {
    const { bpm } = detectTempo(kickTrack(120, 8));
    expect(bpm).toBeGreaterThanOrEqual(118);
    expect(bpm).toBeLessThanOrEqual(122);
  });

  it("detecta 128 BPM dentro de ±2", () => {
    const { bpm } = detectTempo(kickTrack(128, 8));
    expect(bpm).toBeGreaterThanOrEqual(126);
    expect(bpm).toBeLessThanOrEqual(130);
  });

  it("dá confiança alta em sinal limpo e ~0 em silêncio", () => {
    const clean = detectTempo(kickTrack(124, 8));
    const quiet = detectTempo(silence(8));
    expect(clean.confidence).toBeGreaterThan(0.2);
    expect(quiet.confidence).toBeLessThan(clean.confidence);
  });

  it("ancora a grade na fase dos kicks (um kick cai num beat)", () => {
    const grid = analyzeBeatGrid(kickTrack(120, 8));
    // Há um kick em t=2.0s; o beat mais próximo deve coincidir.
    expect(grid.nearestBeat(2.01)).toBeCloseTo(2.0, 1);
  });
});

describe("createBeatGrid", () => {
  const grid = createBeatGrid(120, 0, 1); // período 0.5s, 4/4

  it("calcula instantes de beat a partir do índice", () => {
    expect(grid.beatAt(0)).toBeCloseTo(0);
    expect(grid.beatAt(4)).toBeCloseTo(2.0);
    expect(grid.beatAt(-2)).toBeCloseTo(-1.0);
  });

  it("acha o índice e o beat mais próximo de um instante", () => {
    expect(grid.beatIndexAt(1.51)).toBe(3);
    expect(grid.nearestBeat(1.49)).toBeCloseTo(1.5);
  });

  it("marca downbeat a cada 4 beats (compasso 4/4)", () => {
    expect(grid.isDownbeat(0)).toBe(true);
    expect(grid.isDownbeat(4)).toBe(true);
    expect(grid.isDownbeat(-4)).toBe(true);
    expect(grid.isDownbeat(1)).toBe(false);
    expect(grid.isDownbeat(3)).toBe(false);
  });
});
