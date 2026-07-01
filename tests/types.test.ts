import { describe, it, expect } from "vitest";
import { createDefaultPipelineParams, MAX_LAYERS } from "@/lib/types";

describe("createDefaultPipelineParams", () => {
  it("returns a fresh object each call (no shared mutable state)", () => {
    const a = createDefaultPipelineParams();
    const b = createDefaultPipelineParams();
    a.layerDensity = 99;
    expect(b.layerDensity).toBe(2);
  });

  it("nested pattern params are fresh per call", () => {
    const a = createDefaultPipelineParams();
    const b = createDefaultPipelineParams();
    a.grid.count = 99;
    a.spiral.zoom = 99;
    a.rings.count = 99;
    expect(b.grid.count).toBe(3);
    expect(b.spiral.zoom).toBe(1);
    expect(b.rings.count).toBe(4);
  });

  it("starts calm and readable: no geometric pattern, sane density", () => {
    const p = createDefaultPipelineParams();
    expect(p.pattern).toBe("none");
    expect(p.layerDensity).toBeGreaterThanOrEqual(1);
    expect(p.layerDensity).toBeLessThanOrEqual(MAX_LAYERS);
    expect(p.reactivity).toBeGreaterThan(0);
  });

  it("defaults to a valid blend mode and transition", () => {
    const p = createDefaultPipelineParams();
    expect(["difference", "exclusion", "screen", "add", "displacement"]).toContain(p.blendMode);
    expect(["time", "beat"]).toContain(p.transitionMode);
  });
});
