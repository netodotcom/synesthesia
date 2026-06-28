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
});
