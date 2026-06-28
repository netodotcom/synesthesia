import { describe, it, expect } from "vitest";
import {
  visualParamsReducer,
  SEGMENT_STEPS,
  ROTATION_SPEEDS,
  PALETTE_COUNT,
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
