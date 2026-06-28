"use client";

import { useEffect } from "react";
import { KEY_BINDINGS, type Command } from "@/state/keybindings";

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Escuta keydown global e dispara o comando mapeado para cada tecla. Ignora
 * eventos vindos de campos de formulário para não atrapalhar a digitação.
 */
export function useKeyboardControls(onCommand: (command: Command) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const map = new Map(KEY_BINDINGS.map((b) => [b.key, b.command]));

    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (TYPING_TAGS.has(target.tagName) || target.isContentEditable)) return;

      const command = map.get(event.key.toLowerCase());
      if (command) {
        event.preventDefault();
        onCommand(command);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCommand, enabled]);
}
