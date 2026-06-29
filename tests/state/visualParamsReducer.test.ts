import { describe, it, expect } from "vitest";
import {
  visualParamsReducer,
  SEGMENT_STEPS,
  ROTATION_SPEEDS,
  PALETTE_COUNT,
  MIRROR_COUNTS,
  HUE_STEP,
  TAU,
} from "@/state/visualParamsReducer";
import { createDefaultVisualParams, type VisualParams } from "@/lib/types";

const base = createDefaultVisualParams;

describe("visualParamsReducer", () => {
  it("does not mutate the input state (purity)", () => {
    const state = base();
    const snapshot = { ...state };
    visualParamsReducer(state, { type: "zoom-in" });
    expect(state).toEqual(snapshot);
  });

  it("cycle-segments advances through the step list and wraps", () => {
    let state: VisualParams = { ...base(), segments: SEGMENT_STEPS[0] };
    for (let i = 1; i < SEGMENT_STEPS.length; i++) {
      state = visualParamsReducer(state, { type: "cycle-segments" });
      expect(state.segments).toBe(SEGMENT_STEPS[i]);
    }
    state = visualParamsReducer(state, { type: "cycle-segments" });
    expect(state.segments).toBe(SEGMENT_STEPS[0]); // wrap
  });

  it("cycle-palette advances the id and inverts when wrapping to 0", () => {
    let state = { ...base(), paletteId: 0, paletteInverted: false };
    for (let i = 0; i < PALETTE_COUNT - 1; i++) {
      state = visualParamsReducer(state, { type: "cycle-palette" });
    }
    expect(state.paletteId).toBe(PALETTE_COUNT - 1);
    expect(state.paletteInverted).toBe(false);
    state = visualParamsReducer(state, { type: "cycle-palette" });
    expect(state.paletteId).toBe(0);
    expect(state.paletteInverted).toBe(true); // inverteu ao dar a volta
  });

  it("toggle-strobe flips the strobe flag", () => {
    const on = visualParamsReducer({ ...base(), strobe: false }, { type: "toggle-strobe" });
    expect(on.strobe).toBe(true);
    const off = visualParamsReducer(on, { type: "toggle-strobe" });
    expect(off.strobe).toBe(false);
  });

  it("cycle-rotation moves to another speed in the set (changing direction)", () => {
    const state = { ...base(), rotationSpeed: ROTATION_SPEEDS[3] }; // 0.2
    const next = visualParamsReducer(state, { type: "cycle-rotation" });
    expect(ROTATION_SPEEDS).toContain(next.rotationSpeed as number);
    expect(next.rotationSpeed).not.toBe(state.rotationSpeed);
  });

  it("zoom-in increases zoom and clamps at the maximum", () => {
    let state = { ...base(), zoom: 1 };
    state = visualParamsReducer(state, { type: "zoom-in" });
    expect(state.zoom).toBeGreaterThan(1);
    for (let i = 0; i < 50; i++) state = visualParamsReducer(state, { type: "zoom-in" });
    expect(state.zoom).toBeLessThanOrEqual(6);
  });

  it("zoom-out decreases zoom and clamps at the minimum", () => {
    let state = { ...base(), zoom: 1 };
    state = visualParamsReducer(state, { type: "zoom-out" });
    expect(state.zoom).toBeLessThan(1);
    for (let i = 0; i < 50; i++) state = visualParamsReducer(state, { type: "zoom-out" });
    expect(state.zoom).toBeGreaterThanOrEqual(0.2);
  });

  it("inc-warp increases then wraps back to 0 past the maximum", () => {
    let state = { ...base(), warp: 1.45 };
    state = visualParamsReducer(state, { type: "inc-warp" }); // 1.6 > 1.5 → 0
    expect(state.warp).toBe(0);
    state = visualParamsReducer(state, { type: "inc-warp" });
    expect(state.warp).toBeGreaterThan(0);
  });

  it("toggle-trails switches between 0 and a positive value", () => {
    const on = visualParamsReducer({ ...base(), trails: 0 }, { type: "toggle-trails" });
    expect(on.trails).toBeGreaterThan(0);
    const off = visualParamsReducer(on, { type: "toggle-trails" });
    expect(off.trails).toBe(0);
  });
});

describe("visualParamsReducer — chroma", () => {
  it("set-chroma merges only the provided fields", () => {
    const state = base();
    const next = visualParamsReducer(state, {
      type: "set-chroma",
      payload: { saturation: 1.5 },
    });
    expect(next.chroma.saturation).toBe(1.5);
    expect(next.chroma.contrast).toBe(state.chroma.contrast); // intacto
    expect(next.chroma.brightness).toBe(state.chroma.brightness);
  });

  it("set-chroma clamps each field to its valid range", () => {
    const next = visualParamsReducer(base(), {
      type: "set-chroma",
      payload: {
        brightness: 5,
        contrast: -3,
        gamma: 99,
        saturation: -1,
        exposure: 100,
      },
    });
    expect(next.chroma.brightness).toBe(0.5);
    expect(next.chroma.contrast).toBe(0);
    expect(next.chroma.gamma).toBe(3);
    expect(next.chroma.saturation).toBe(0);
    expect(next.chroma.exposure).toBe(2);
  });

  it("set-chroma never lets gamma reach zero (guards 1/γ)", () => {
    const next = visualParamsReducer(base(), { type: "set-chroma", payload: { gamma: 0 } });
    expect(next.chroma.gamma).toBeGreaterThan(0);
  });

  it("set-chroma does not mutate the input (purity)", () => {
    const state = base();
    const snapshot = JSON.parse(JSON.stringify(state));
    visualParamsReducer(state, { type: "set-chroma", payload: { hueShift: 2 } });
    expect(state).toEqual(snapshot);
  });

  it("cycle-hue advances by one step and wraps within [0, TAU)", () => {
    let state = { ...base(), chroma: { ...base().chroma, hueShift: 0 } };
    state = visualParamsReducer(state, { type: "cycle-hue" });
    expect(state.chroma.hueShift).toBeCloseTo(HUE_STEP, 5);
    // dá a volta completa e fica abaixo de TAU
    for (let i = 0; i < 20; i++) state = visualParamsReducer(state, { type: "cycle-hue" });
    expect(state.chroma.hueShift).toBeGreaterThanOrEqual(0);
    expect(state.chroma.hueShift).toBeLessThan(TAU);
  });
});

describe("visualParamsReducer — specular", () => {
  it("toggle-mirror-x / toggle-mirror-y flip independently", () => {
    let state = base();
    state = visualParamsReducer(state, { type: "toggle-mirror-x" });
    expect(state.specular.horizontalMirror).toBe(true);
    expect(state.specular.verticalMirror).toBe(false);
    state = visualParamsReducer(state, { type: "toggle-mirror-y" });
    expect(state.specular.verticalMirror).toBe(true);
    state = visualParamsReducer(state, { type: "toggle-mirror-x" });
    expect(state.specular.horizontalMirror).toBe(false);
  });

  it("cycle-mirror-count steps through the set and wraps", () => {
    let state: VisualParams = {
      ...base(),
      specular: { ...base().specular, mirrorCount: MIRROR_COUNTS[0] },
    };
    for (let i = 1; i < MIRROR_COUNTS.length; i++) {
      state = visualParamsReducer(state, { type: "cycle-mirror-count" });
      expect(state.specular.mirrorCount).toBe(MIRROR_COUNTS[i]);
    }
    state = visualParamsReducer(state, { type: "cycle-mirror-count" });
    expect(state.specular.mirrorCount).toBe(MIRROR_COUNTS[0]); // wrap
  });

  it("set-mirror-count rounds to an int and clamps to [0, 12]", () => {
    expect(visualParamsReducer(base(), { type: "set-mirror-count", payload: 3.7 }).specular.mirrorCount).toBe(4);
    expect(visualParamsReducer(base(), { type: "set-mirror-count", payload: 99 }).specular.mirrorCount).toBe(12);
    expect(visualParamsReducer(base(), { type: "set-mirror-count", payload: -5 }).specular.mirrorCount).toBe(0);
  });

  it("set-mirror-offset clamps to [-0.5, 0.5]", () => {
    expect(visualParamsReducer(base(), { type: "set-mirror-offset", payload: 9 }).specular.mirrorOffset).toBe(0.5);
    expect(visualParamsReducer(base(), { type: "set-mirror-offset", payload: -9 }).specular.mirrorOffset).toBe(-0.5);
  });

  it("specular actions do not mutate the input (purity)", () => {
    const state = base();
    const snapshot = JSON.parse(JSON.stringify(state));
    visualParamsReducer(state, { type: "toggle-mirror-x" });
    visualParamsReducer(state, { type: "set-mirror-count", payload: 8 });
    expect(state).toEqual(snapshot);
  });
});
