"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";
import type { AssemblyStage, SeatLook, SeatScene } from "../lib/seat-scene";
import { DEFAULT_SEAT_SHAPE } from "../lib/shapes";

type Status = "idle" | "loading" | "ready" | "fallback";

/** Las 4 capas del 3D, en el orden del taller. Los textos salen del panel. */
const STAGES: Array<Exclude<AssemblyStage, "despiece">> = ["base", "espuma", "forro", "terminada"];

export type ProcessStep = { title: string; text: string };

// Una silla de muestra: centro negro antideslizante, costados y costura rojos.
const LOOK: SeatLook = {
  shape: DEFAULT_SEAT_SHAPE,
  center: "#161616",
  sides: "#b3121f",
  stitch: "#e9e7e1",
  pattern: "antideslizante",
  grip: "grueso",
  embroidery: "MOTOSMART",
  thread: "#e9e7e1",
  embroideryStyle: "recta"
};

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * "Así se hace tu silla": la silla en 3D por capas. Abre con el despiece
 * (base, espuma y forro separados en el aire) y cada paso la va armando:
 * la espuma cae sobre la base, el forro encima y la costura recorre la
 * silla puntada a puntada. three.js se baja solo cuando la sección se acerca;
 * sin WebGL se ve la foto fija del despiece y los pasos siguen leyéndose.
 */
export function SeatProcess({ poster, steps }: { poster: { narrow: string; wide: string }; steps: ProcessStep[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SeatScene | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState<AssemblyStage>("despiece");

  useEffect(() => {
    const element = stageRef.current;
    const canvas = canvasRef.current;
    if (!element || !canvas) return;
    let cancelled = false;
    const fail = (error: unknown) => {
      console.error("Así se hace tu silla", error);
      sceneRef.current?.dispose();
      sceneRef.current = null;
      if (!cancelled) setStatus("fallback");
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (!canUseWebGL()) {
          setStatus("fallback");
          return;
        }
        setStatus("loading");
        import("../lib/seat-scene")
          .then(({ mountSeatScene }) => {
            if (cancelled) return;
            sceneRef.current = mountSeatScene(canvas, LOOK, {
              reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
              assembly: "despiece",
              onReady: () => {
                if (!cancelled) setStatus("ready");
              },
              onError: fail
            });
          })
          .catch(fail);
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(element);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      sceneRef.current?.dispose();
      sceneRef.current = null;
      if (!cancelled) setStatus("fallback");
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", onContextLost);
      observer.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  function choose(next: AssemblyStage) {
    setStage(next);
    sceneRef.current?.setAssembly(next);
  }

  const live = status !== "fallback";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-12">
      <div
        ref={stageRef}
        className="seat-stage relative aspect-[4/3] w-full overflow-hidden rounded-xl md:aspect-[16/11]"
        tabIndex={0}
        role="group"
        aria-roledescription="vista 3D"
        aria-label="Silla en 3D por capas. Arrástrala o usa las flechas del teclado para girarla."
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            sceneRef.current?.rotateBy(event.key === "ArrowLeft" ? -0.3 : 0.3);
          }
        }}
      >
        <picture>
          <source media="(min-width: 48rem)" srcSet={poster.wide} />
          <img
            src={poster.narrow}
            alt=""
            aria-hidden="true"
            className={cx(
              "absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
              status === "ready" ? "opacity-0" : "opacity-100"
            )}
          />
        </picture>
        <canvas
          ref={canvasRef}
          className={cx(
            "absolute inset-0 h-full w-full cursor-grab touch-pan-y transition-opacity duration-500 active:cursor-grabbing",
            status === "ready" ? "opacity-100" : "opacity-0"
          )}
        />
        <p className="pointer-events-none absolute top-3 left-3 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
          Vista 3D de referencia
        </p>
      </div>

      <div>
        <ol className="space-y-2">
          {STAGES.map((id, index) => {
            const step = steps[index] ?? { title: "", text: "" };
            const active = live && stage === id;
            return (
              <li key={id}>
                {/* Sin 3D los pasos se leen igual, como lista. */}
                {live ? (
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => choose(id)}
                    className={cx(
                      "flex w-full gap-4 rounded-lg border px-4 py-3 text-left transition-[background-color,border-color,scale] duration-150 ease-out active:scale-[0.99]",
                      active ? "border-ink bg-surface-2" : "border-line hover:border-ink-3"
                    )}
                  >
                    <StepBody index={index} title={step.title} text={step.text} active={active} />
                  </button>
                ) : (
                  <div className="flex gap-4 rounded-lg border border-line px-4 py-3">
                    <StepBody index={index} title={step.title} text={step.text} active />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {live ? (
          <button
            type="button"
            aria-pressed={stage === "despiece"}
            onClick={() => choose("despiece")}
            className={cx(
              "link-underline mt-4 inline-flex min-h-11 items-center text-sm font-semibold",
              stage === "despiece" ? "text-ink-3" : "text-ink"
            )}
          >
            Ver todas las capas separadas
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StepBody({ index, title, text, active }: { index: number; title: string; text: string; active: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cx("type-display tabular w-8 shrink-0 text-2xl leading-none", active ? "text-brand" : "text-ink-3")}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-2">{text}</span>
      </span>
    </>
  );
}
