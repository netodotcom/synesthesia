import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";

describe("useAudioAnalyser", () => {
  it("starts not ready, with no source and a null sample", () => {
    const { result } = renderHook(() => useAudioAnalyser());
    expect(result.current.ready).toBe(false);
    expect(result.current.source).toBeNull();
    expect(result.current.sample()).toBeNull();
  });

  it("unmounts cleanly without ever creating an AudioContext", () => {
    // jsdom não tem AudioContext; provar que montar/desmontar não o toca.
    const { unmount } = renderHook(() => useAudioAnalyser());
    expect(() => unmount()).not.toThrow();
  });

  it("exposes a stable sample function across renders", () => {
    const { result, rerender } = renderHook(() => useAudioAnalyser());
    const first = result.current.sample;
    rerender();
    expect(result.current.sample).toBe(first);
  });
});
