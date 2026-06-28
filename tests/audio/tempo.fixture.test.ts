import { describe, it, expect } from "vitest";
import { detectTempo } from "@/audio/tempo";
import { computePeaks } from "@/audio/waveform";
import { readWav } from "../fixtures/readWav";

/**
 * Teste de pipeline end-to-end (headless): pega o WAV real de fixture, decodifica
 * o PCM e roda os mesmos motores que o browser usa. Prova decode→BPM→waveform
 * sem precisar de Web Audio. Regenere o fixture com `node scripts/gen-test-wav.mjs`.
 */
const wav = readWav("tests/fixtures/kick-120bpm.wav");

describe("pipeline real — kick-120bpm.wav", () => {
  it("decodifica o fixture (8s @ 44.1kHz mono)", () => {
    expect(wav.sampleRate).toBe(44100);
    expect(wav.numberOfChannels).toBe(1);
    expect(wav.length).toBeGreaterThan(44100 * 7);
  });

  it("detecta ~120 BPM com confiança real", () => {
    const { bpm, confidence } = detectTempo(wav);
    expect(bpm).toBeGreaterThanOrEqual(118);
    expect(bpm).toBeLessThanOrEqual(122);
    expect(confidence).toBeGreaterThan(0.2);
  });

  it("extrai picos de waveform com energia", () => {
    const peaks = computePeaks(wav, 600);
    expect(peaks.length).toBe(600);
    let max = 0;
    for (let i = 0; i < peaks.length; i++) max = Math.max(max, peaks.max[i]);
    expect(max).toBeGreaterThan(0.1);
  });
});
