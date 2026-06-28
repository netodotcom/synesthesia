"use client";

interface Props {
  onFile: (file: File) => void;
  fileName: string | null;
}

/** Input limpo para subir .mp3/.wav. Mostra o nome do arquivo atual. */
export function AudioUploader({ onFile, fileName }: Props) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/20">
      <span aria-hidden>⬆</span>
      <span className="max-w-[160px] truncate">
        {fileName ?? "Subir áudio (.mp3 / .wav)"}
      </span>
      <input
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
