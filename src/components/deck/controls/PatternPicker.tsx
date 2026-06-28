"use client";

import type { PatternSource } from "@/patterns/types";

interface Props {
  sources: PatternSource[];
  activeId: string;
  onSelect: (id: string) => void;
  onUploadImage: (file: File) => void;
}

/**
 * Seletor de padrão base. Renderiza um botão por fonte do registry; a fonte de
 * upload vira um input de arquivo. Agnóstico ao número/tipo de fontes.
 */
export function PatternPicker({ sources, activeId, onSelect, onUploadImage }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((source) => {
        const active = source.id === activeId;
        const className = [
          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          active
            ? "bg-fuchsia-500 text-white"
            : "bg-white/10 text-white/70 hover:bg-white/20",
        ].join(" ");

        if (source.kind === "upload") {
          return (
            <label key={source.id} className={`${className} cursor-pointer`}>
              {source.label}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadImage(file);
                  e.target.value = "";
                }}
              />
            </label>
          );
        }

        return (
          <button
            key={source.id}
            type="button"
            aria-pressed={active}
            className={className}
            onClick={() => onSelect(source.id)}
          >
            {source.label}
          </button>
        );
      })}
    </div>
  );
}
