import { describe, it, expect } from "vitest";
import { createLayerScheduler } from "@/textures/layerScheduler";

describe("createLayerScheduler", () => {
  it("emits an empty window once when there is no selection", () => {
    const s = createLayerScheduler<number>();
    expect(s.update(0, 0)).toEqual([]); // dirty → emite vazio
    expect(s.update(0.1, 0)).toBeNull(); // nada mudou
  });

  it("emits the initial window up to the density, then null until it changes", () => {
    const s = createLayerScheduler<number>();
    s.setSelection([10, 20, 30, 40]);
    s.setParams(2, "time", 4);
    expect(s.update(0, 0)).toEqual([10, 20]);
    expect(s.update(0.5, 0)).toBeNull();
  });

  it("advances the window by the interval in time mode (wrapping)", () => {
    const s = createLayerScheduler<number>();
    s.setSelection([1, 2, 3]);
    s.setParams(2, "time", 2);
    expect(s.update(0, 0)).toEqual([1, 2]); // ancora relógio no t=0
    expect(s.update(1.9, 0)).toBeNull();
    expect(s.update(2.0, 0)).toEqual([2, 3]);
    expect(s.update(4.0, 0)).toEqual([3, 1]);
  });

  it("does not auto-advance when the interval is 0 (manual)", () => {
    const s = createLayerScheduler<number>();
    s.setSelection([1, 2, 3]);
    s.setParams(1, "time", 0);
    expect(s.update(0, 0)).toEqual([1]);
    expect(s.update(100, 0)).toBeNull();
  });

  it("advances on beatEnergy crossing the threshold (rising edge) in beat mode", () => {
    const s = createLayerScheduler<number>();
    s.setSelection([1, 2, 3]);
    s.setParams(1, "beat", 4, 0.5, "cut");
    expect(s.update(0, 0)).toEqual([1]); // janela inicial
    expect(s.update(0.1, 0.3)).toBeNull(); // abaixo do limiar
    expect(s.update(0.2, 0.8)).toEqual([2]); // sobe → avança
    expect(s.update(0.3, 0.9)).toBeNull(); // continua acima → sem nova borda
    expect(s.update(0.4, 0.1)).toBeNull(); // cai
    expect(s.update(0.5, 0.7)).toEqual([3]); // cruza de novo → avança
  });

  it("cut mode advances by exactly one on each hit", () => {
    const s = createLayerScheduler<number>();
    s.setSelection([1, 2, 3, 4, 5]);
    s.setParams(1, "beat", 4, 0.5, "cut");
    s.update(0, 0);
    expect(s.update(1, 0.9)).toEqual([2]);
    expect(s.update(2, 0.1)).toBeNull();
    expect(s.update(3, 0.9)).toEqual([3]);
  });

  it("warp mode shuffles by a non-unit step, deterministically", () => {
    const seq = () => {
      const s = createLayerScheduler<number>();
      s.setSelection([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      s.setParams(1, "beat", 4, 0.5, "warp");
      const out: (number[] | null)[] = [s.update(0, 0)];
      out.push(s.update(1, 0.9));
      out.push(s.update(2, 0.1));
      out.push(s.update(3, 0.9));
      return out;
    };
    const a = seq();
    const b = seq();
    expect(a[0]).toEqual([0]);
    expect(a[1]).not.toEqual([1]); // shuffle ≠ simple +1
    expect(a[1]).not.toBeNull();
    expect(a[3]).not.toBeNull();
    expect(a).toEqual(b); // seeded → fully reproducible
  });

  it("re-emits when density changes", () => {
    const s = createLayerScheduler<number>();
    s.setSelection([1, 2, 3, 4]);
    s.setParams(1, "time", 999);
    expect(s.update(0, 0)).toEqual([1]);
    s.setParams(3, "time", 999);
    expect(s.update(0.1, 0)).toEqual([1, 2, 3]);
  });

  it("caps the window to the selection length", () => {
    const s = createLayerScheduler<number>();
    s.setSelection([7, 8]);
    s.setParams(5, "time", 999);
    expect(s.update(0, 0)).toEqual([7, 8]);
  });

  it("resets the window to the start on a new selection", () => {
    const s = createLayerScheduler<number>();
    s.setSelection([1, 2, 3]);
    s.setParams(1, "time", 1);
    s.update(0, 0);
    s.update(1, 0); // avança para [2]
    s.setSelection([9, 8, 7]);
    expect(s.update(1.1, 0)).toEqual([9]);
  });
});
