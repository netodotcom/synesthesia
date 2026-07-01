"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type * as THREE from "three";
import { createRenderer, diagnoseWebGL, type PipelineRenderer } from "@/visuals/renderer";
import { applyUniforms } from "@/visuals/uniforms";
import { MOD_DEPTH, bandEnergy } from "@/visuals/modulation";
import type { LayerScheduler } from "@/textures/layerScheduler";
import type { AudioFrame, PipelineParams } from "@/lib/types";

interface Props {
  /** Parâmetros do pipeline, lidos a cada frame via ref (nunca via estado React). */
  paramsRef: RefObject<PipelineParams | null>;
  /** Frame de áudio atual; estável entre renders. */
  getFrame: () => AudioFrame | null;
  /** Agenda qual janela de camadas está ativa por frame (tempo/beat). */
  scheduler: LayerScheduler<THREE.Texture>;
  /** Entrega o renderer pronto (o deck usa para gravação/captura do canvas). */
  onReady?: (renderer: PipelineRenderer) => void;
}

/**
 * Monta o renderer three.js e é dono do loop de requestAnimationFrame. Todo o
 * trabalho pesado é imperativo aqui; a árvore React não re-renderiza por frame.
 * A cada frame: avança o agendador de camadas (rebind só quando muda), projeta
 * os params/áudio nos uniforms e renderiza. Limpa rAF + WebGL no unmount.
 */
export function StageCanvas({ paramsRef, getFrame, scheduler, onReady }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let r: PipelineRenderer;
    try {
      r = createRenderer(mount);
    } catch (err) {
      const reason = diagnoseWebGL();
      console.error("Falha ao criar o contexto WebGL:", err, "| motivo:", reason);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(
        "WebGL indisponível neste navegador. O visualizador roda na GPU e precisa de WebGL ativo." +
          (reason ? ` Motivo reportado pelo navegador: “${reason}”.` : "") +
          " Tente: (1) janela anônima (desliga extensões); (2) fechar e reabrir o navegador;" +
          " (3) chrome://gpu deve mostrar WebGL ativo.",
      );
      return;
    }
    onReady?.(r);

    const observer = new ResizeObserver(() => r.resize());
    observer.observe(mount);

    let raf = 0;
    const tick = (now: number) => {
      const params = paramsRef.current;
      if (params) {
        const frame = getFrame();
        // Densidade de camadas modulada pela banda ligada (instantânea): a
        // energia expande/contrai a janela; roteia via scheduler para manter
        // uLayerCount em sincronia com as texturas realmente vinculadas.
        const densBand = params.bindings.layerDensity;
        const density =
          densBand === "none"
            ? params.layerDensity
            : Math.round(
                params.layerDensity +
                  bandEnergy(frame, densBand) * params.reactivity * MOD_DEPTH.layerDensity,
              );
        scheduler.setParams(
          density,
          params.transitionMode,
          params.transitionInterval,
          params.beatThreshold,
          params.beatTransition,
        );
        const window = scheduler.update(now / 1000, frame?.beatEnergy ?? 0);
        if (window) r.setLayers(window);
        applyUniforms(r.uniforms, params, frame, now / 1000);
        r.render();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      r.dispose();
    };
  }, [paramsRef, getFrame, scheduler, onReady]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black p-8 text-center">
        <p className="max-w-md text-sm text-white/70">{error}</p>
      </div>
    );
  }

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}
