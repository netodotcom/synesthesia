import { describe, it, expect } from "vitest";
import { computeBands, computeLevel, DEFAULT_BANDS } from "@/audio/bands";

const SAMPLE_RATE = 44100;
const BIN_COUNT = 1024; // fftSize 2048 → hzPerBin ≈ 21.53

const emptyFft = () => new Uint8Array(BIN_COUNT);

describe("computeBands", () => {
  it("isolates energy into the sub band when only the lowest bins are hot", () => {
    const freq = emptyFft();
    // bins 0..4 caem dentro de ~20-120 Hz (banda sub)
    for (let i = 0; i < 5; i++) freq[i] = 255;

    const bands = computeBands(freq, SAMPLE_RATE);

    expect(bands.sub).toBeGreaterThan(0.6);
    expect(bands.low).toBeLessThan(0.05);
    expect(bands.mid).toBeLessThan(0.05);
    expect(bands.high).toBeLessThan(0.05);
  });

  it("normalizes magnitudes to the 0..1 range", () => {
    const bands = computeBands(emptyFft().fill(255), SAMPLE_RATE);
    for (const v of Object.values(bands)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(bands.high).toBeCloseTo(1, 2);
  });

  it("reuses the provided out object instead of allocating", () => {
    const out = { sub: 0, low: 0, mid: 0, high: 0 };
    const result = computeBands(emptyFft(), SAMPLE_RATE, DEFAULT_BANDS, out);
    expect(result).toBe(out);
  });
});

describe("computeLevel", () => {
  it("returns 0 for silence and ~1 for full-scale", () => {
    expect(computeLevel(emptyFft())).toBe(0);
    expect(computeLevel(emptyFft().fill(255))).toBeCloseTo(1, 5);
  });
});
