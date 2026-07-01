"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { StageCanvas } from "@/components/deck/StageCanvas";
import { TexturePoolPanel } from "@/components/deck/controls/TexturePoolPanel";
import { BlendWorktree } from "@/components/deck/controls/BlendWorktree";
import { PatternWorktree } from "@/components/deck/controls/PatternWorktree";
import { AudioUploader } from "@/components/deck/controls/AudioUploader";
import { SourceToggle } from "@/components/deck/controls/SourceToggle";
import { AudioTransport } from "@/components/deck/controls/AudioTransport";
import { RecordButton } from "@/components/deck/controls/RecordButton";
import { WaveformPanel } from "@/components/deck/WaveformPanel";
import { FpsOverlay } from "@/components/FpsOverlay";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { usePipelineParams } from "@/hooks/usePipelineParams";
import { useTexturePool } from "@/hooks/useTexturePool";
import { createTexturePool, type TexturePool } from "@/textures/texturePool";
import { createLayerScheduler, type LayerScheduler } from "@/textures/layerScheduler";
import { DEFAULT_PROFILE } from "@/patterns/unsplash/unsplashClient";
import type { PoolImage } from "@/textures/types";
import type { PipelineRenderer } from "@/visuals/renderer";
import { decodeAudioFile } from "@/audio/decode";
import { analyzeBeatGrid } from "@/audio/tempo";
import { computePeaks } from "@/audio/waveform";
import type { BeatGrid, WaveformPeaks } from "@/lib/types";

const WAVEFORM_BUCKETS = 1200;

/**
 * Composição raiz: palco (pipeline de textura na GPU) + engine de input (pool
 * Unsplash/uploads) + duas worktrees de parâmetros + áudio. Os params vivem em
 * ref (hot path). A seleção do pool vira texturas alimentadas ao agendador de
 * camadas, que decide a janela ativa por frame (tempo/beat).
 */
export function DeckShell() {
  const { paramsRef, params, patch } = usePipelineParams();
  const pool = useTexturePool();

  // Recursos imperativos estáveis (criados uma vez; legíveis no render).
  const [texPool] = useState<TexturePool>(() => createTexturePool());
  const [scheduler] = useState<LayerScheduler<THREE.Texture>>(() =>
    createLayerScheduler<THREE.Texture>(),
  );

  const rendererRef = useRef<PipelineRenderer | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const fileUrlRef = useRef<string | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const autoLoadedRef = useRef(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [beatGrid, setBeatGrid] = useState<BeatGrid | null>(null);
  const [peaks, setPeaks] = useState<WaveformPeaks | null>(null);

  const [poolOpen, setPoolOpen] = useState(true);
  const [blendOpen, setBlendOpen] = useState(true);
  const [patternOpen, setPatternOpen] = useState(true);

  const { connectFile, connectMic, setSource, sample, source, getRecordingStream } =
    useAudioAnalyser();

  const getCanvas = useCallback(() => rendererRef.current?.renderer.domElement ?? null, []);
  const handleReady = useCallback((renderer: PipelineRenderer) => {
    rendererRef.current = renderer;
  }, []);

  // --- Texturas: seleção do pool → agendador de camadas ----------------------
  useEffect(() => {
    let cancelled = false;
    const chosen = pool.selectedIds
      .map((id) => pool.items.find((i) => i.id === id))
      .filter((i): i is PoolImage => Boolean(i));
    Promise.all(chosen.map((it) => texPool.load(it.id, it.src).catch(() => null))).then((texs) => {
      if (cancelled) return;
      scheduler.setSelection(texs.filter((t): t is THREE.Texture => Boolean(t)));
    });
    return () => {
      cancelled = true;
    };
  }, [pool.selectedIds, pool.items, texPool, scheduler]);

  // Nota: densidade/modo/intervalo/limiar de transição vão ao agendador a cada
  // frame no StageCanvas — a densidade pode ser modulada por áudio, então precisa
  // ser reavaliada por frame, não por efeito.

  // Reconcilia a GPU: libera texturas de itens que saíram do pool (sem vazar).
  useEffect(() => {
    const current = new Set(pool.items.map((i) => i.id));
    for (const id of knownIdsRef.current) if (!current.has(id)) texPool.release(id);
    knownIdsRef.current = current;
  }, [pool.items, texPool]);

  // Carrega o perfil padrão uma vez (assim que houver chave e o pool estiver vazio).
  useEffect(() => {
    if (autoLoadedRef.current || !pool.hasKey) return;
    autoLoadedRef.current = true;
    if (!pool.items.some((i) => i.kind === "unsplash")) {
      void pool.loadProfile(pool.activeUsername || DEFAULT_PROFILE);
    }
  }, [pool]);

  // Libera todas as texturas no unmount.
  useEffect(() => () => texPool.dispose(), [texPool]);

  // --- Áudio -----------------------------------------------------------------
  const loadFile = useCallback(
    async (file: File) => {
      const el = audioElRef.current;
      if (!el) return;
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
      const url = URL.createObjectURL(file);
      fileUrlRef.current = url;
      el.src = url;
      setFileName(file.name);
      setBeatGrid(null);
      setPeaks(null);
      try {
        await connectFile(el);
        await el.play().catch(() => {});
      } catch (error) {
        console.error("Falha ao conectar/tocar o arquivo", error);
      }
      try {
        const track = await decodeAudioFile(file);
        setPeaks(computePeaks(track.buffer, WAVEFORM_BUCKETS));
        setBeatGrid(analyzeBeatGrid(track.buffer));
      } catch (error) {
        console.error("Falha na análise da faixa (waveform/BPM)", error);
      }
    },
    [connectFile],
  );

  const enableMic = useCallback(async () => {
    try {
      await connectMic();
    } catch (error) {
      console.error("Microfone indisponível ou negado", error);
    }
  }, [connectMic]);

  const useFileSource = useCallback(() => {
    if (fileName) setSource("file");
  }, [fileName, setSource]);

  useEffect(
    () => () => {
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    },
    [],
  );

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-black">
      <StageCanvas
        paramsRef={paramsRef}
        getFrame={sample}
        scheduler={scheduler}
        onReady={handleReady}
      />

      <audio ref={audioElRef} hidden />

      <WaveformPanel peaks={peaks} grid={beatGrid} audioRef={audioElRef} />

      {/* Coluna esquerda: áudio + engine de input (pool de texturas) */}
      <div className="absolute left-4 top-24 z-40 flex max-h-[calc(100dvh-7rem)] flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-xl bg-black/50 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <AudioUploader onFile={loadFile} fileName={fileName} />
            <SourceToggle
              active={source}
              fileReady={fileName !== null}
              onSelectFile={useFileSource}
              onSelectMic={enableMic}
            />
            <RecordButton getCanvas={getCanvas} getAudioStream={getRecordingStream} />
          </div>
          <AudioTransport audioRef={audioElRef} />
          {beatGrid && beatGrid.bpm > 0 && (
            <p className="font-mono text-[10px] tracking-wider text-white/60">
              {beatGrid.bpm.toFixed(1)} <span className="text-white/40">BPM</span>
            </p>
          )}
        </div>

        <TexturePoolPanel pool={pool} open={poolOpen} onToggle={() => setPoolOpen((o) => !o)} />
      </div>

      {/* Coluna direita: as duas worktrees de parâmetros */}
      <div className="absolute right-4 top-24 z-40 flex max-h-[calc(100dvh-7rem)] flex-col gap-3 overflow-y-auto">
        <BlendWorktree
          params={params}
          patch={patch}
          open={blendOpen}
          onToggle={() => setBlendOpen((o) => !o)}
        />
        <PatternWorktree
          params={params}
          patch={patch}
          open={patternOpen}
          onToggle={() => setPatternOpen((o) => !o)}
        />
      </div>

      <FpsOverlay />
    </main>
  );
}
