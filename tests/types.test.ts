import { describe, it, expect } from "vitest";
import { createDefaultVisualParams } from "@/lib/types";

describe("createDefaultVisualParams", () => {
  it("returns a fresh object each call (no shared mutable state)", () => {
    const a = createDefaultVisualParams();
    const b = createDefaultVisualParams();
    a.segments = 99;
    expect(b.segments).toBe(6);
  });

  it("starts calm: strobe and trails off", () => {
    const p = createDefaultVisualParams();
    expect(p.strobe).toBe(false);
    expect(p.trails).toBe(0);
  });

  it("defaults to a valid pattern id and positive reactivity", () => {
    const p = createDefaultVisualParams();
    expect(p.patternId.length).toBeGreaterThan(0);
    expect(p.reactivity).toBeGreaterThan(0);
  });

  it("chroma defaults to the identity grade (no visual change)", () => {
    const { chroma } = createDefaultVisualParams();
    expect(chroma).toEqual({
      brightness: 0,
      contrast: 1,
      gamma: 1,
      saturation: 1,
      hueShift: 0,
      exposure: 1,
    });
  });

  it("specular defaults to no folding (mirrors off, no extra fold)", () => {
    const { specular } = createDefaultVisualParams();
    expect(specular).toEqual({
      horizontalMirror: false,
      verticalMirror: false,
      mirrorCount: 0,
      mirrorOffset: 0,
    });
  });

  it("nested chroma/specular are fresh per call (no shared mutable state)", () => {
    const a = createDefaultVisualParams();
    const b = createDefaultVisualParams();
    a.chroma.saturation = 99;
    a.specular.mirrorCount = 8;
    expect(b.chroma.saturation).toBe(1);
    expect(b.specular.mirrorCount).toBe(0);
  });
});
