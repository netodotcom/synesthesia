"use client";

import { useCallback, useRef, useState } from "react";
import { createDefaultPipelineParams, type PipelineParams } from "@/lib/types";

export interface UsePipelineParams {
  /** Lido pelo loop de render a cada frame (sem causar re-render). */
  paramsRef: React.RefObject<PipelineParams>;
  /** Snapshot para a UI que precisa refletir o estado atual. */
  params: PipelineParams;
  /** Mescla um patch parcial (top-level; para aninhados, espalhe o sub-objeto). */
  patch: (partial: Partial<PipelineParams>) => void;
}

/**
 * Mantém os PipelineParams em um ref (hot path do canvas) e um snapshot em estado
 * (para a UI). `patch` atualiza os dois de forma consistente. Substitui o antigo
 * useVisualParams/reducer — o novo controle é 100% por sliders/dropdowns.
 */
export function usePipelineParams(initial?: PipelineParams): UsePipelineParams {
  const [params, setParams] = useState<PipelineParams>(
    () => initial ?? createDefaultPipelineParams(),
  );
  const paramsRef = useRef<PipelineParams>(params);

  const patch = useCallback((partial: Partial<PipelineParams>) => {
    const next = { ...paramsRef.current, ...partial };
    paramsRef.current = next;
    setParams(next);
  }, []);

  return { paramsRef, params, patch };
}
