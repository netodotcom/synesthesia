"use client";

import type { AudioSourceKind } from "@/audio/AudioGraph";

interface Props {
  active: AudioSourceKind | null;
  fileReady: boolean;
  onSelectFile: () => void;
  onSelectMic: () => void;
}

/** Alterna a fonte de análise entre o arquivo tocando e o microfone. */
export function SourceToggle({ active, fileReady, onSelectFile, onSelectMic }: Props) {
  const tab = (on: boolean, enabled: boolean) =>
    [
      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
      on ? "bg-cyan-400 text-black" : "text-white/70",
      enabled ? "hover:bg-white/15" : "cursor-not-allowed opacity-40",
    ].join(" ");

  return (
    <div className="inline-flex rounded-lg bg-white/10 p-0.5">
      <button
        type="button"
        disabled={!fileReady}
        aria-pressed={active === "file"}
        className={tab(active === "file", fileReady)}
        onClick={onSelectFile}
      >
        Arquivo
      </button>
      <button
        type="button"
        aria-pressed={active === "mic"}
        className={tab(active === "mic", true)}
        onClick={onSelectMic}
      >
        Microfone
      </button>
    </div>
  );
}
