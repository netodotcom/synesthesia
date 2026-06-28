import { describe, it, expect } from "vitest";
import { KEY_BINDINGS, type Command } from "@/state/keybindings";

const EXPECTED_KEYS = ["q", "w", "e", "r", "a", "s", "d", "f", "z", "x"];

describe("KEY_BINDINGS", () => {
  it("maps exactly the 10 required keys", () => {
    expect(KEY_BINDINGS).toHaveLength(10);
    expect(KEY_BINDINGS.map((b) => b.key).sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it("has unique keys and unique commands", () => {
    const keys = KEY_BINDINGS.map((b) => b.key);
    const commands = KEY_BINDINGS.map((b) => b.command);
    expect(new Set(keys).size).toBe(10);
    expect(new Set(commands).size).toBe(10);
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
