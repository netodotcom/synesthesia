"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioGraph, type AudioSourceKind } from "@/audio/AudioGraph";
import type { AudioFrame } from "@/lib/types";

export interface UseAudioAnalyser {
  /** true depois que uma fonte (arquivo ou mic) foi conectada. */
  ready: boolean;
  /** Fonte ativa, ou null antes de conectar. */
  source: AudioSourceKind | null;
  /** Conecta o elemento <audio> do player de arquivo. */
  connectFile: (el: HTMLAudioElement) => Promise<void>;
  /** Pede permissão de microfone e o conecta. */
  connectMic: () => Promise<void>;
  /** Alterna a fonte ativa sem recriar o contexto. */
  setSource: (kind: AudioSourceKind) => void;
  /** Frame de áudio atual (FFT + bandas + beat). Null antes de conectar. */
  sample: () => AudioFrame | null;
  /** MediaStream de áudio para gravação (tap do AudioGraph). Null sem fonte. */
  getRecordingStream: () => MediaStream | null;
}

/**
 * Mantém um AudioGraph imperativo em ref (fora da árvore de render) e expõe
 * uma API estável. O AudioContext só nasce no primeiro connect* (exige gesto
 * do usuário) — instanciar o hook não toca em APIs de áudio.
 */
export function useAudioAnalyser(): UseAudioAnalyser {
  const graphRef = useRef<AudioGraph | null>(null);
  const [ready, setReady] = useState(false);
  const [source, setSourceState] = useState<AudioSourceKind | null>(null);

  if (graphRef.current === null) {
    graphRef.current = new AudioGraph();
  }

  useEffect(() => {
    const graph = graphRef.current;
    return () => {
      graph?.dispose();
      graphRef.current = null;
    };
  }, []);

  const connectFile = useCallback(async (el: HTMLAudioElement) => {
    await graphRef.current!.connectFile(el);
    setReady(true);
    setSourceState("file");
  }, []);

  const connectMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await graphRef.current!.connectMic(stream);
    setReady(true);
    setSourceState("mic");
  }, []);

  const setSource = useCallback((kind: AudioSourceKind) => {
    graphRef.current!.setSource(kind);
    setSourceState(kind);
  }, []);

  const sample = useCallback(() => graphRef.current?.sample() ?? null, []);

  const getRecordingStream = useCallback(
    () => graphRef.current?.getRecordingStream() ?? null,
    [],
  );

  return { ready, source, connectFile, connectMic, setSource, sample, getRecordingStream };
}
