import { describe, it, expect } from "vitest";
import { createProceduralSource } from "@/patterns/procedural/proceduralSource";

describe("createProceduralSource", () => {
  it("reports the procedural kind and its id/label", () => {
    const source = createProceduralSource("p-test", "Teste", () => [0, 0, 0]);
    expect(source.kind).toBe("procedural");
    expect(source.id).toBe("p-test");
    expect(source.label).toBe("Teste");
  });

  it("generates an RGBA DataTexture of the requested size", () => {
    const source = createProceduralSource("p", "P", (u) => [u * 255, 0, 0]);
    const tex = source.getTexture({ size: 8 });
    // DataTexture é síncrona — não é Promise.
    expect("then" in tex).toBe(false);
    const image = (tex as { image: { width: number; height: number; data: Uint8Array } }).image;
    expect(image.width).toBe(8);
    expect(image.height).toBe(8);
    expect(image.data.length).toBe(8 * 8 * 4);
    expect(image.data[3]).toBe(255); // alpha opaco
  });

  it("clamps shader output into the 0..255 byte range", () => {
    const source = createProceduralSource("p", "P", () => [999, -50, 128]);
    const tex = source.getTexture({ size: 2 });
    const data = (tex as { image: { data: Uint8Array } }).image.data;
    expect(data[0]).toBe(255); // 999 -> 255
    expect(data[1]).toBe(0); // -50 -> 0
    expect(data[2]).toBe(128);
  });

  it("does not throw on dispose", () => {
    const source = createProceduralSource("p", "P", () => [0, 0, 0]);
    source.getTexture({ size: 2 });
    expect(() => source.dispose()).not.toThrow();
  });
});
