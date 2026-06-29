"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KaleidoscopeCanvas } from "@/components/deck/KaleidoscopeCanvas";
import { PatternPicker } from "@/components/deck/controls/PatternPicker";
import { AudioUploader } from "@/components/deck/controls/AudioUploader";
import { SourceToggle } from "@/components/deck/controls/SourceToggle";
import { AudioTransport } from "@/components/deck/controls/AudioTransport";
import { KeyHelpOverlay } from "@/components/deck/controls/KeyHelpOverlay";
import { FpsOverlay } from "@/components/FpsOverlay";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { useVisualParams } from "@/hooks/useVisualParams";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { createPatternRegistry } from "@/patterns/registry";
import type { UploadPatternSource } from "@/patterns/upload/uploadSource";
import type { Command } from "@/state/keybindings";
import type { KaleidoRenderer } from "@/visuals/renderer";
import { decodeAudioFile } from "@/audio/decode";
import { analyzeBeatGrid } from "@/audio/tempo";
import { computePeaks } from "@/audio/waveform";
import { WaveformPanel } from "@/components/deck/WaveformPanel";
import { RecordButton } from "@/components/deck/controls/RecordButton";
import { ChromaSpecularPanel } from "@/components/deck/controls/ChromaSpecularPanel";
import { beatPulseAt, type BeatPulse } from "@/visuals/beatPulse";
import type { BeatGrid, WaveformPeaks } from "@/lib/types";

const WAVEFORM_BUCKETS = 1200;

const TEXTURE_SIZE = 1024;

/**
 * Composição raiz: caleidoscópio + áudio (arquivo/mic) + padrões + teclado.
 * Params vivem em ref (hot path) com snapshot para a UI; o frame de áudio
 * alimenta o visual via `audio.sample`.
 */
export function DeckShell() {
  const { paramsRef, params, dispatch, patch } = useVisualParams();
  const rendererRef = useRef<KaleidoRenderer | null>(null);
  const registry = useMemo(() => createPatternRegistry(), []);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const fileUrlRef = useRef<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [beatGrid, setBeatGrid] = useState<BeatGrid | null>(null);
  const [peaks, setPeaks] = useState<WaveformPeaks | null>(null);

  // beatGrid espelhado em ref para getBeat ser estável (ele está no dep array do
  // canvas — mudar a identidade recriaria o renderer e perderia a textura).
  const beatGridRef = useRef<BeatGrid | null>(null);
  useEffect(() => {
    beatGridRef.current = beatGrid;
  }, [beatGrid]);

  const getBeat = useCallback((): BeatPulse | null => {
    const grid = beatGridRef.current;
    const el = audioElRef.current;
    if (!grid || grid.bpm <= 0 || !el) return null;
    return beatPulseAt(grid, el.currentTime);
  }, []);

  const getCanvas = useCallback(
    () => rendererRef.current?.renderer.domElement ?? null,
    [],
  );

  const { connectFile, connectMic, setSource, sample, source, getRecordingStream } =
    useAudioAnalyser();

  // --- Padrões ---------------------------------------------------------------
  const selectPattern = useCallback(
    async (id: string) => {
      const patternSource = registry.find((s) => s.id === id);
      const renderer = rendererRef.current;
      if (!patternSource || !renderer) return;
      try {
        const texture = await patternSource.getTexture({ size: TEXTURE_SIZE });
        renderer.setTexture(texture);
        patch({ patternId: id });
      } catch (error) {
        console.error(`Falha ao aplicar o padrão "${id}"`, error);
      }
    },
    [patch, registry],
  );

  const handleReady = useCallback(
    (renderer: KaleidoRenderer) => {
      rendererRef.current = renderer;
      void selectPattern(paramsRef.current.patternId);
    },
    [selectPattern, paramsRef],
  );

  const handleUploadImage = useCallback(
    (file: File) => {
      const upload = registry.find(
        (s) => s.kind === "upload",
      ) as UploadPatternSource | undefined;
      if (!upload) return;
      upload.setImage(file);
      void selectPattern(upload.id);
    },
    [selectPattern, registry],
  );

  // --- Teclado ---------------------------------------------------------------
  const handleCommand = useCallback(
    (command: Command) => {
      if (command === "pattern-prev" || command === "pattern-next") {
        const ids = registry.map((s) => s.id);
        const index = ids.indexOf(paramsRef.current.patternId);
        const dir = command === "pattern-next" ? 1 : -1;
        const nextId = ids[(index + dir + ids.length) % ids.length];
        void selectPattern(nextId);
      } else {
        dispatch({ type: command });
      }
    },
    [dispatch, selectPattern, paramsRef, registry],
  );

  useKeyboardControls(handleCommand);

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
      // Análise offline (waveform + BPM/grade) — não bloqueia o playback.
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
      <KaleidoscopeCanvas
        paramsRef={paramsRef}
        getFrame={sample}
        getBeat={getBeat}
        onReady={handleReady}
      />

      <audio ref={audioElRef} hidden />

      {/* Faixa como instrumento (strip superior, largura total) */}
      <WaveformPanel peaks={peaks} grid={beatGrid} audioRef={audioElRef} />

      {/* Painel de áudio (abaixo da waveform) */}
      <div className="absolute left-4 top-24 z-40 flex flex-col gap-2 rounded-xl bg-black/50 p-3 backdrop-blur-sm">
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
            <span className="ml-2 text-white/30">
              conf {Math.round(beatGrid.confidence * 100)}%
            </span>
          </p>
        )}
      </div>

      <KeyHelpOverlay />

      {/* Seletor de padrão (rodapé-esquerda) */}
      <div className="absolute bottom-4 left-4 z-40 rounded-xl bg-black/50 p-3 backdrop-blur-sm">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
          Padrão base
        </p>
        <PatternPicker
          sources={registry}
          activeId={params.patternId}
          onSelect={selectPattern}
          onUploadImage={handleUploadImage}
        />
      </div>

      {/* Ajuste fino de cor/forma (perímetro inferior-direito, colapsável) */}
      <ChromaSpecularPanel chroma={params.chroma} specular={params.specular} dispatch={dispatch} />

      <FpsOverlay />
    </main>
  );
}
