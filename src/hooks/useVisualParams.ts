"use client";

import { useCallback, useRef, useState } from "react";
import { createDefaultVisualParams, type VisualParams } from "@/lib/types";
import { visualParamsReducer, type ParamAction } from "@/state/visualParamsReducer";

export interface UseVisualParams {
  /** Lido pelo loop de render a cada frame (sem causar re-render). */
  paramsRef: React.RefObject<VisualParams>;
  /** Snapshot para a UI que precisa refletir o estado atual. */
  params: VisualParams;
  /** Aplica uma ação do reducer (teclas Q–F). */
  dispatch: (action: ParamAction) => void;
  /** Mescla um patch parcial (ex.: seleção de padrão). */
  patch: (partial: Partial<VisualParams>) => void;
}

/**
 * Mantém os VisualParams em um ref (para o hot path do canvas) e um snapshot em
 * estado (para a UI). `dispatch`/`patch` atualizam ambos de forma consistente.
 */
export function useVisualParams(initial?: VisualParams): UseVisualParams {
  // O state é a fonte do valor inicial; o ref é semeado a partir dele (sem ler
  // ref.current durante o render — exigência do react-hooks/refs).
  const [params, setParams] = useState<VisualParams>(
    () => initial ?? createDefaultVisualParams(),
  );
  const paramsRef = useRef<VisualParams>(params);

  const dispatch = useCallback((action: ParamAction) => {
    const next = visualParamsReducer(paramsRef.current, action);
    paramsRef.current = next;
    setParams(next);
  }, []);

  const patch = useCallback((partial: Partial<VisualParams>) => {
    const next = { ...paramsRef.current, ...partial };
    paramsRef.current = next;
    setParams(next);
  }, []);

  return { paramsRef, params, dispatch, patch };
}
