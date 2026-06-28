"use client";

import { KEY_BINDINGS } from "@/state/keybindings";

/** Cola de referência das 10 teclas, lida direto do mapa canônico. */
export function KeyHelpOverlay() {
  return (
    <div className="absolute right-4 top-4 z-40 rounded-xl bg-black/50 p-3 backdrop-blur-sm">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
        Teclas
      </p>
      <ul className="grid grid-cols-1 gap-1">
        {KEY_BINDINGS.map((binding) => (
          <li key={binding.key} className="flex items-center gap-2 text-xs text-white/70">
            <kbd className="grid h-5 w-5 place-items-center rounded bg-white/15 font-mono text-[10px] text-white">
              {binding.key.toUpperCase()}
            </kbd>
            <span>{binding.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
