import { describe, it, expect } from "vitest";
import { applyUniforms, createUniforms } from "@/visuals/uniforms";
import { createDefaultPipelineParams } from "@/lib/types";
import type { AudioFrame } from "@/lib/types";

const frameWith = (overrides: Partial<AudioFrame> = {}): AudioFrame => ({
  frequency: new Uint8Array(0),
  bands: { sub: 0.2, low: 0.3, mid: 0.4, high: 0.5 },
  level: 0.6,
  beat: true,
  beatEnergy: 0.7,
  ...overrides,
});

describe("createUniforms", () => {
  it("provides every uniform with a sane default", () => {
    const u = createUniforms();
    expect(u.uResolution.value.x).toBeGreaterThan(0);
    expect(u.uLayerCount.value).toBe(0);
    expect(u.uReactivity.value).toBe(1);
    expect(Array.isArray(u.uLayers.value)).toBe(true);
  });
});

describe("applyUniforms", () => {
  it("maps blend mode + pattern to their integer indices", () => {
    const u = createUniforms();
    applyUniforms(u, { ...createDefaultPipelineParams(), blendMode: "displacement", pattern: "rings" }, null, 1);
    expect(u.uBlendMode.value).toBe(4);
    expect(u.uPattern.value).toBe(3);
  });

  it("projects blend modes in the documented order", () => {
    const u = createUniforms();
    const base = createDefaultPipelineParams();
    applyUniforms(u, { ...base, blendMode: "difference" }, null, 0);
    expect(u.uBlendMode.value).toBe(0);
    applyUniforms(u, { ...base, blendMode: "screen" }, null, 0);
    expect(u.uBlendMode.value).toBe(2);
    applyUniforms(u, { ...base, blendMode: "add" }, null, 0);
    expect(u.uBlendMode.value).toBe(3);
  });

  it("maps pattern sub-params into their uniforms", () => {
    const u = createUniforms();
    const params = createDefaultPipelineParams();
    params.pattern = "grid";
    params.grid = { count: 5, gap: 0.1, altRotation: 1.2 };
    applyUniforms(u, params, null, 0);
    expect(u.uGridCount.value).toBe(5);
    expect(u.uGridGap.value).toBe(0.1);
    expect(u.uGridAltRot.value).toBe(1.2);
  });

  it("clamps grid/ring counts to a minimum of 1", () => {
    const u = createUniforms();
    const params = createDefaultPipelineParams();
    params.grid.count = 0;
    params.rings.count = 0;
    applyUniforms(u, params, null, 0);
    expect(u.uGridCount.value).toBeGreaterThanOrEqual(1);
    expect(u.uRingCount.value).toBeGreaterThanOrEqual(1);
  });

  it("feeds the audio bands into uBands when a frame is present", () => {
    const u = createUniforms();
    applyUniforms(u, createDefaultPipelineParams(), frameWith(), 0);
    expect(u.uBands.value.x).toBe(0.2);
    expect(u.uBands.value.w).toBe(0.5);
    expect(u.uBeat.value).toBe(0.7);
    expect(u.uLevel.value).toBe(0.6);
  });

  it("decays audio-driven uniforms when no frame is available", () => {
    const u = createUniforms();
    u.uLevel.value = 1;
    u.uBeat.value = 1;
    applyUniforms(u, createDefaultPipelineParams(), null, 0);
    expect(u.uLevel.value).toBeLessThan(1);
    expect(u.uBeat.value).toBeLessThan(1);
  });

  it("writes the current time", () => {
    const u = createUniforms();
    applyUniforms(u, createDefaultPipelineParams(), null, 12.5);
    expect(u.uTime.value).toBe(12.5);
  });
});
