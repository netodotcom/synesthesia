"use client";

import { useRef, useState } from "react";
import type { UseTexturePool } from "@/hooks/useTexturePool";
import { withUtm } from "@/patterns/unsplash/unsplashClient";

interface Props {
  pool: UseTexturePool;
  open: boolean;
  onToggle: () => void;
}

/**
 * Engine de input (esquerda): pool de texturas Unsplash + uploads locais, com
 * seleção múltipla. As imagens selecionadas entram no pipeline de renderização.
 * Colapsável e semitransparente para não poluir o palco.
 */
export function TexturePoolPanel({ pool, open, onToggle }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const {
    hasKey,
    query,
    profiles,
    activeUsername,
    items,
    selectedIds,
    loading,
    error,
    setAccessKey,
    setQuery,
    searchProfiles,
    loadProfile,
    fetchMore,
    addUploads,
    removeItem,
    toggleSelect,
    clearSelection,
    isSelected,
  } = pool;

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="rounded-xl bg-black/50 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/50 backdrop-blur-sm transition-colors hover:text-white/80"
      >
        Pool de texturas ({selectedIds.length})
      </button>
    );
  }

  return (
    <div className="flex max-h-[calc(100dvh-13rem)] w-72 flex-col gap-2.5 overflow-y-auto rounded-xl bg-black/55 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">Pool de texturas</p>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Recolher painel"
          className="font-mono text-[10px] text-white/40 transition-colors hover:text-white/70"
        >
          –
        </button>
      </div>

      {!hasKey && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/5 p-2">
          <label className="font-mono text-[10px] uppercase tracking-wider text-white/50">
            Unsplash Access Key
          </label>
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="cole seu Access Key"
            className="rounded-md bg-black/50 px-2 py-1 font-mono text-xs text-white outline-none ring-1 ring-white/10 focus:ring-fuchsia-500"
          />
          <button
            type="button"
            onClick={() => setAccessKey(keyDraft)}
            disabled={!keyDraft.trim()}
            className="rounded-md bg-fuchsia-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-fuchsia-400 disabled:opacity-40"
          >
            Salvar chave
          </button>
        </div>
      )}

      {hasKey && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void searchProfiles();
            }}
            className="flex gap-1.5"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="buscar perfil…"
              className="min-w-0 flex-1 rounded-md bg-black/50 px-2 py-1 font-mono text-xs text-white outline-none ring-1 ring-white/10 focus:ring-fuchsia-500"
            />
            <button
              type="submit"
              className="rounded-md bg-white/10 px-2.5 py-1 text-xs text-white/80 transition-colors hover:bg-white/20"
            >
              🔍
            </button>
          </form>

          {profiles.length > 0 && (
            <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void loadProfile(p.username)}
                  className={[
                    "flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors",
                    p.username === activeUsername
                      ? "bg-fuchsia-500/20 ring-1 ring-fuchsia-500"
                      : "hover:bg-white/10",
                  ].join(" ")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.profile_image.small} alt="" className="h-6 w-6 rounded-full" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="block truncate text-xs text-white/90">{p.name}</span>
                    <span className="block truncate font-mono text-[10px] text-white/40">
                      @{p.username}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between font-mono text-[10px] text-white/50">
            <a
              href={withUtm(`https://unsplash.com/@${activeUsername}`)}
              target="_blank"
              rel="noreferrer"
              className="truncate underline decoration-white/20 hover:text-white/80"
            >
              @{activeUsername}
            </a>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => void loadProfile(activeUsername)}
                className="rounded px-1.5 py-0.5 transition-colors hover:bg-white/10 hover:text-white/80"
              >
                recarregar
              </button>
              <button
                type="button"
                onClick={() => void fetchMore()}
                className="rounded bg-white/10 px-1.5 py-0.5 text-white/80 transition-colors hover:bg-white/20"
              >
                + fetch more
              </button>
            </div>
          </div>
        </>
      )}

      {/* Dropzone de upload local */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addUploads(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className={[
          "cursor-pointer rounded-lg border border-dashed px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wider transition-colors",
          dragOver
            ? "border-fuchsia-500 bg-fuchsia-500/10 text-white/80"
            : "border-white/15 text-white/40 hover:border-white/30 hover:text-white/60",
        ].join(" ")}
      >
        arraste imagens ou clique · png / jpg
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addUploads(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {loading && <p className="font-mono text-[10px] text-white/40">carregando…</p>}
      {error && (
        <p className="rounded-md bg-red-500/15 px-2 py-1 font-mono text-[10px] text-red-300">{error}</p>
      )}

      {/* Grade do pool com seleção múltipla */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {items.map((item) => {
            const on = isSelected(item.id);
            return (
              <div key={item.id} className="group relative aspect-square">
                <button
                  type="button"
                  onClick={() => toggleSelect(item.id)}
                  title={item.label}
                  aria-pressed={on}
                  className={[
                    "h-full w-full overflow-hidden rounded-md ring-1 transition-all",
                    on ? "ring-2 ring-fuchsia-500" : "ring-white/10 hover:ring-white/40",
                  ].join(" ")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumb}
                    alt={item.label}
                    loading="lazy"
                    className={[
                      "h-full w-full object-cover transition-transform",
                      on ? "scale-105" : "group-hover:scale-105",
                    ].join(" ")}
                  />
                </button>
                {on && (
                  <span className="pointer-events-none absolute left-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-fuchsia-500 text-[10px] font-bold text-white shadow">
                    ✓
                  </span>
                )}
                {item.kind === "upload" && (
                  <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/70 px-1 font-mono text-[8px] uppercase text-white/70">
                    up
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remover ${item.label}`}
                  className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-black/80 text-[10px] text-white/70 opacity-0 ring-1 ring-white/20 transition-opacity hover:text-white group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between font-mono text-[10px] text-white/40">
        <span>{selectedIds.length} no pipeline</span>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={clearSelection}
            className="transition-colors hover:text-white/70"
          >
            limpar seleção
          </button>
        )}
      </div>

      <p className="font-mono text-[9px] leading-tight text-white/25">
        Fotos via{" "}
        <a
          href={withUtm("https://unsplash.com")}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-white/20 hover:text-white/50"
        >
          Unsplash
        </a>
        . Crédito aos autores.
      </p>
    </div>
  );
}
