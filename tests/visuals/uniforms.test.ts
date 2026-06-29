import { describe, it, expect } from "vitest";
import { applyUniforms, createUniforms } from "@/visuals/uniforms";
import { createDefaultVisualParams } from "@/lib/types";
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
    expect(u.uSegments.value).toBeGreaterThanOrEqual(2);
    expect(u.uResolution.value.x).toBeGreaterThan(0);
    expect(u.uTexture.value).toBeNull();
    expect(u.uReactivity.value).toBe(1);
  });
});

describe("applyUniforms", () => {
  it("maps visual params into the matching uniforms", () => {
    const u = createUniforms();
    const params = {
      ...createDefaultVisualParams(),
      segments: 12,
      paletteInverted: true,
      strobe: true,
      zoom: 1.5,
    };
    applyUniforms(u, params, null, 1, 0);
    expect(u.uSegments.value).toBe(12);
    expect(u.uPaletteInvert.value).toBe(1);
    expect(u.uStrobe.value).toBe(1);
    expect(u.uZoom.value).toBe(1.5);
  });

  it("clamps segments to a minimum of 2", () => {
    const u = createUniforms();
    applyUniforms(u, { ...createDefaultVisualParams(), segments: 1 }, null, 0, 0);
    expect(u.uSegments.value).toBeGreaterThanOrEqual(2);
  });

  it("accumulates rotation by rotationSpeed * dt", () => {
    const u = createUniforms();
    applyUniforms(u, { ...createDefaultVisualParams(), rotationSpeed: 2 }, null, 0, 0.5);
    expect(u.uRotation.value).toBeCloseTo(1, 5);
  });

  it("feeds the audio bands into the uBands vec4 when a frame is present", () => {
    const u = createUniforms();
    applyUniforms(u, createDefaultVisualParams(), frameWith(), 0, 0);
    expect(u.uBands.value.x).toBe(0.2);
    expect(u.uBands.value.w).toBe(0.5);
    expect(u.uBeat.value).toBe(0.7);
    expect(u.uLevel.value).toBe(0.6);
  });

  it("decays audio-driven uniforms when no frame is available", () => {
    const u = createUniforms();
    u.uLevel.value = 1;
    u.uBeat.value = 1;
    applyUniforms(u, createDefaultVisualParams(), null, 0, 0);
    expect(u.uLevel.value).toBeLessThan(1);
    expect(u.uBeat.value).toBeLessThan(1);
  });

  it("defaults the chroma uniforms to the identity grade", () => {
    const u = createUniforms();
    applyUniforms(u, createDefaultVisualParams(), null, 0, 0);
    expect(u.uBrightness.value).toBe(0);
    expect(u.uContrast.value).toBe(1);
    expect(u.uGamma.value).toBe(1);
    expect(u.uSaturation.value).toBe(1);
    expect(u.uHueShift.value).toBe(0);
    expect(u.uExposure.value).toBe(1);
  });

  it("projects chroma params into their uniforms", () => {
    const u = createUniforms();
    const params = createDefaultVisualParams();
    params.chroma = {
      brightness: 0.1,
      contrast: 1.4,
      gamma: 0.8,
      saturation: 1.7,
      hueShift: 2.5,
      exposure: 1.2,
    };
    applyUniforms(u, params, null, 0, 0);
    expect(u.uBrightness.value).toBe(0.1);
    expect(u.uContrast.value).toBe(1.4);
    expect(u.uGamma.value).toBe(0.8);
    expect(u.uSaturation.value).toBe(1.7);
    expect(u.uHueShift.value).toBe(2.5);
    expect(u.uExposure.value).toBe(1.2);
  });

  it("projects specular params (mirrors as 0/1) into their uniforms", () => {
    const u = createUniforms();
    const params = createDefaultVisualParams();
    params.specular = {
      horizontalMirror: true,
      verticalMirror: false,
      mirrorCount: 6,
      mirrorOffset: 0.25,
    };
    applyUniforms(u, params, null, 0, 0);
    expect(u.uMirrorX.value).toBe(1);
    expect(u.uMirrorY.value).toBe(0);
    expect(u.uMirrorCount.value).toBe(6);
    expect(u.uMirrorOffset.value).toBe(0.25);
  });
});
