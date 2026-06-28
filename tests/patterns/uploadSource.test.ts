import { describe, it, expect } from "vitest";
import { createUploadSource } from "@/patterns/upload/uploadSource";

describe("createUploadSource", () => {
  it("starts with the upload kind and no image", () => {
    const source = createUploadSource();
    expect(source.kind).toBe("upload");
    expect(source.hasImage).toBe(false);
  });

  it("rejects getTexture before an image is provided", async () => {
    const source = createUploadSource();
    await expect(source.getTexture({ size: 8 })).rejects.toThrow(/imagem/i);
  });

  it("does not throw on dispose when empty", () => {
    const source = createUploadSource();
    expect(() => source.dispose()).not.toThrow();
  });
});
