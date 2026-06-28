import { describe, it, expect } from "vitest";
import { BeatDetector } from "@/audio/beat";

/** Semeia a média móvel com energia baixa estável. */
function warmup(d: BeatDetector, value = 0.1, frames = 20) {
  for (let i = 0; i < frames; i++) d.detect(value);
}

describe("BeatDetector", () => {
  it("fires on a sub-bass spike above the running average", () => {
    const d = new BeatDetector();
    warmup(d);
    const r = d.detect(0.8);
    expect(r.beat).toBe(true);
    expect(r.energy).toBeGreaterThan(0);
  });

  it("does not fire on steady input (no spike over the average)", () => {
    const d = new BeatDetector();
    let beats = 0;
    for (let i = 0; i < 40; i++) if (d.detect(0.3).beat) beats++;
    expect(beats).toBe(0);
  });

  it("does not fire below the absolute floor even on a relative spike", () => {
    const d = new BeatDetector();
    warmup(d, 0.0); // média ~0
    // 0.1 é grande relativamente, mas abaixo do piso (0.15)
    expect(d.detect(0.1).beat).toBe(false);
  });

  it("enforces a refractory window after a kick", () => {
    const d = new BeatDetector({ refractoryFrames: 6 });
    warmup(d);
    expect(d.detect(0.8).beat).toBe(true);
    expect(d.detect(0.8).beat).toBe(false); // dentro da janela refratária
  });

  it("decays beat energy between kicks", () => {
    const d = new BeatDetector();
    warmup(d);
    const peak = d.detect(0.9).energy;
    let last = peak;
    for (let i = 0; i < 5; i++) last = d.detect(0.02).energy;
    expect(last).toBeLessThan(peak);
    expect(last).toBeGreaterThan(0);
  });

  it("reset() clears state so the next frame only primes", () => {
    const d = new BeatDetector();
    warmup(d);
    d.reset();
    expect(d.detect(0.9).beat).toBe(false); // primeiro frame pós-reset só semeia
  });
});
