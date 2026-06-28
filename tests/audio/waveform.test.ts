import { describe, it, expect } from "vitest";
import { computePeaks, type PcmSource } from "@/audio/waveform";

function mono(data: number[]): PcmSource {
  const arr = Float32Array.from(data);
  return { length: arr.length, numberOfChannels: 1, getChannelData: () => arr };
}

describe("computePeaks", () => {
  it("captura min/max por bucket", () => {
    // 4 amostras, 2 buckets → [0.5,-0.5] e [1,-1]
    const peaks = computePeaks(mono([0.5, -0.5, 1, -1]), 2);
    expect(peaks.length).toBe(2);
    expect(peaks.max[0]).toBeCloseTo(0.5);
    expect(peaks.min[0]).toBeCloseTo(-0.5);
    expect(peaks.max[1]).toBeCloseTo(1);
    expect(peaks.min[1]).toBeCloseTo(-1);
  });

  it("sinal constante → min == max no bucket", () => {
    const peaks = computePeaks(mono([0.5, 0.5, 0.5, 0.5]), 2);
    expect(peaks.min[0]).toBeCloseTo(0.5);
    expect(peaks.max[0]).toBeCloseTo(0.5);
  });

  it("faz mixdown mono dos dois canais", () => {
    const a = Float32Array.from([1, 1]);
    const b = Float32Array.from([-1, -1]);
    const stereo: PcmSource = {
      length: 2,
      numberOfChannels: 2,
      getChannelData: (ch) => (ch === 0 ? a : b),
    };
    const peaks = computePeaks(stereo, 1);
    expect(peaks.max[0]).toBeCloseTo(0); // (1 + -1)/2
    expect(peaks.min[0]).toBeCloseTo(0);
  });

  it("limita os buckets ao nº de amostras", () => {
    const peaks = computePeaks(mono([0.2, 0.4]), 100);
    expect(peaks.length).toBe(2);
  });

  it("buffer vazio não quebra", () => {
    const peaks = computePeaks(mono([]), 8);
    expect(peaks.length).toBe(1);
    expect(peaks.min[0]).toBe(0);
    expect(peaks.max[0]).toBe(0);
  });
});
