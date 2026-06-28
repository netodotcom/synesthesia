import { describe, it, expect } from "vitest";
import { createPatternRegistry } from "@/patterns/registry";
import { createDefaultVisualParams } from "@/lib/types";

describe("createPatternRegistry", () => {
  it("exposes 3 to 5 sources", () => {
    const sources = createPatternRegistry();
    expect(sources.length).toBeGreaterThanOrEqual(3);
    expect(sources.length).toBeLessThanOrEqual(5);
  });

  it("covers all three pattern kinds", () => {
    const kinds = new Set(createPatternRegistry().map((s) => s.kind));
    expect(kinds).toContain("procedural");
    expect(kinds).toContain("static");
    expect(kinds).toContain("upload");
  });

  it("uses unique ids", () => {
    const ids = createPatternRegistry().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes the default patternId so the deck can resolve it", () => {
    const ids = createPatternRegistry().map((s) => s.id);
    expect(ids).toContain(createDefaultVisualParams().patternId);
  });
});
