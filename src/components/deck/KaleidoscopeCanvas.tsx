"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createRenderer, diagnoseWebGL, type KaleidoRenderer } from "@/visuals/renderer";
import { applyUniforms } from "@/visuals/uniforms";
import type { BeatPulse } from "@/visuals/beatPulse";
import type { AudioFrame, VisualParams } from "@/lib/types";

interface Props {
  /** Parâmetros visuais, lidos a cada frame via ref (nunca via estado React). */
  paramsRef: RefObject<VisualParams | null>;
  /** Fonte do frame de áudio atual; estável entre renders. */
  getFrame: () => AudioFrame | null;
  /** Pulso travado no beat grid (M10), amostrado por frame; estável entre renders. */
  getBeat?: () => BeatPulse | null;
  /** Entrega o renderer pronto para que o deck troque a textura-feed. */
  onReady?: (renderer: KaleidoRenderer) => void;
}

/**
 * Monta o renderer three.js e é dono do loop de requestAnimationFrame.
 * Todo o trabalho pesado vive aqui (imperativo); a árvore React não re-renderiza
 * por frame. Limpa rAF + dispose do WebGL no unmount.
 */
export function KaleidoscopeCanvas({ paramsRef, getFrame, getBeat, onReady }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let r: KaleidoRenderer;
    try {
      r = createRenderer(mount);
    } catch (err) {
      const reason = diagnoseWebGL();
      console.error("Falha ao criar o contexto WebGL:", err, "| motivo:", reason);
      // Falha única de init do WebGL (não é setState em loop de render) — ok no efeito.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(
        "WebGL indisponível neste navegador. O visualizador roda na GPU e precisa de WebGL ativo." +
          (reason ? ` Motivo reportado pelo navegador: “${reason}”.` : "") +
          " Tente: (1) janela anônima (desliga extensões); (2) fechar e reabrir o navegador inteiro" +
          " para liberar contextos; (3) chrome://gpu deve mostrar WebGL ativo."
      );
      return;
    }
    onReady?.(r);

    const observer = new ResizeObserver(() => r.resize());
    observer.observe(mount);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const params = paramsRef.current;
      if (params) {
        applyUniforms(r.uniforms, params, getFrame(), now / 1000, dt, getBeat?.() ?? null);
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
  }, [paramsRef, getFrame, getBeat, onReady]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black p-8 text-center">
        <p className="max-w-md text-sm text-white/70">{error}</p>
      </div>
    );
  }

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}
