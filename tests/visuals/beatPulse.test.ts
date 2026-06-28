import { describe, it, expect } from "vitest";
import { beatPulseAt } from "@/visuals/beatPulse";
import { createBeatGrid } from "@/audio/tempo";

// 120 BPM, âncora em 0, 4/4 → período 0.5s. Beats em 0, 0.5, 1.0, 1.5, 2.0…
// Downbeats (índices 0, 4, 8…) em 0.0s, 2.0s, 4.0s…
const grid = createBeatGrid(120, 0, 1);
const PERIOD = 0.5;

describe("beatPulseAt", () => {
  it("é ~1 exatamente em cima de um beat", () => {
    expect(beatPulseAt(grid, 0).beatPulse).toBeCloseTo(1, 6);
    expect(beatPulseAt(grid, PERIOD).beatPulse).toBeCloseTo(1, 6); // beat 1
    expect(beatPulseAt(grid, 2.0).beatPulse).toBeCloseTo(1, 6); // beat 4 (downbeat)
  });

  it("decai para perto de zero no meio do intervalo entre beats", () => {
    const mid = beatPulseAt(grid, 0.25).beatPulse; // ponto mais distante de um beat
    expect(mid).toBeLessThan(0.1);
    expect(mid).toBeGreaterThan(0); // nunca negativo
  });

  it("decai monotonicamente conforme se afasta do beat", () => {
    const onBeat = beatPulseAt(grid, 0).beatPulse;
    const near = beatPulseAt(grid, 0.05).beatPulse;
    const far = beatPulseAt(grid, 0.2).beatPulse;
    expect(onBeat).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(far);
  });

  it("downbeatPulse dispara só quando o beat mais próximo é downbeat", () => {
    // Beat 0 (t=0) é downbeat → downbeatPulse acompanha o beatPulse.
    const onDown = beatPulseAt(grid, 0);
    expect(onDown.downbeatPulse).toBeCloseTo(onDown.beatPulse, 6);
    expect(onDown.downbeatPulse).toBeGreaterThan(0);

    // Beat 1 (t=0.5) NÃO é downbeat → beatPulse pulsa, downbeatPulse fica 0.
    const offDown = beatPulseAt(grid, PERIOD);
    expect(offDown.beatPulse).toBeGreaterThan(0.5);
    expect(offDown.downbeatPulse).toBe(0);

    // Beat 4 (t=2.0) é downbeat de novo.
    expect(beatPulseAt(grid, 2.0).downbeatPulse).toBeGreaterThan(0.9);
  });

  it("downbeatPulse some entre downbeats (meio de um compasso, em cima de beat 2)", () => {
    // t=1.0 é o beat 2 do compasso (não downbeat): beatPulse alto, downbeat 0.
    const r = beatPulseAt(grid, 1.0);
    expect(r.beatPulse).toBeCloseTo(1, 6);
    expect(r.downbeatPulse).toBe(0);
  });

  it("grade inválida (bpm=0) → {0, 0}", () => {
    const invalid = createBeatGrid(0, 0, 0);
    expect(beatPulseAt(invalid, 0)).toEqual({ beatPulse: 0, downbeatPulse: 0 });
    expect(beatPulseAt(invalid, 1.234)).toEqual({ beatPulse: 0, downbeatPulse: 0 });
  });

  it("tempo não finito → {0, 0} (robustez)", () => {
    expect(beatPulseAt(grid, NaN)).toEqual({ beatPulse: 0, downbeatPulse: 0 });
    expect(beatPulseAt(grid, Infinity)).toEqual({ beatPulse: 0, downbeatPulse: 0 });
  });

  it("respeita uma âncora de fase deslocada", () => {
    const shifted = createBeatGrid(120, 0.1, 1); // beats em 0.1, 0.6, 1.1…
    expect(beatPulseAt(shifted, 0.1).beatPulse).toBeCloseTo(1, 6);
    expect(beatPulseAt(shifted, 0.1).downbeatPulse).toBeCloseTo(1, 6);
  });
});
