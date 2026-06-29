import { describe, it, expect } from "vitest";
import { KEY_BINDINGS, type Command } from "@/state/keybindings";

const EXPECTED_KEYS = [
  "q", "w", "e", "r", "a", "s", "d", "f", "z", "x",
  "t", "c", "v", "b",
];

describe("KEY_BINDINGS", () => {
  it("maps exactly the 14 required keys", () => {
    expect(KEY_BINDINGS).toHaveLength(14);
    expect(KEY_BINDINGS.map((b) => b.key).sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it("has unique keys and unique commands", () => {
    const keys = KEY_BINDINGS.map((b) => b.key);
    const commands = KEY_BINDINGS.map((b) => b.command);
    expect(new Set(keys).size).toBe(14);
    expect(new Set(commands).size).toBe(14);
  });

  it("binds the new chroma/specular gesture keys", () => {
    const byKey = new Map(KEY_BINDINGS.map((b) => [b.key, b.command]));
    expect(byKey.get("t")).toBe<Command>("cycle-hue");
    expect(byKey.get("c")).toBe<Command>("cycle-mirror-count");
    expect(byKey.get("v")).toBe<Command>("toggle-mirror-x");
    expect(byKey.get("b")).toBe<Command>("toggle-mirror-y");
  });

  it("includes both pattern-cycling commands", () => {
    const commands = KEY_BINDINGS.map((b) => b.command);
    expect(commands).toContain<Command>("pattern-prev");
    expect(commands).toContain<Command>("pattern-next");
  });

  it("gives every binding a non-empty human label", () => {
    for (const binding of KEY_BINDINGS) {
      expect(binding.label.trim().length).toBeGreaterThan(0);
    }
  });
});
