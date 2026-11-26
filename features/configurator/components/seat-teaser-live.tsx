"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/utils";
import type { SeatLook, SeatScene } from "../lib/seat-scene";
import { DEFAULT_SEAT_SHAPE, SEAT_SHAPES, SILHOUETTE_HEIGHT, SILHOUETTE_WIDTH, seatShape, silhouettePath, type SeatShapeId } from "../lib/shapes";
import type { SeatColor } from "../lib/options";

type Status = "idle" | "loading" | "ready" | "fallback";

const SHAPE_OPTIONS = SEAT_SHAPES.map((shape) => ({ ...shape, path: silhouettePath(shape) }));
const EMBROIDERY_MAX = 12;

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function pick(colors: SeatColor[], name: string, fallback: number) {
  return colors.find((color) => color.name.toLowerCase() === name) ?? colors[Math.min(fallback, colors.length - 1)];
}

/**
 * «Arma tu silla» en vivo en el inicio: la silla 3D gira sola y cambia en el
 * acto al tocar el tipo de moto, el color de los costados o escribir el
 * bordado. «Seguir armando» lleva todo eso a la página completa.
 *
 * three.js (~150 kB) se baja solo cuando la sección se acerca a la pantalla;
 * hasta entonces, y sin WebGL, se ve la foto fija de la misma silla. Fuera de
 * pantalla la escena no dibuja. Con «reducir movimiento» no gira sola.
 */
export function SeatTeaserLive({
  colors,
  poster
}: {
  colors: SeatColor[];
  poster: { narrow: string; wide: string };
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SeatScene | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  // La foto fija es esta misma silla: deportiva, centro negro y costados rojos.
  const [shapeId, setShapeId] = useState<SeatShapeId>(DEFAULT_SEAT_SHAPE);
  const [sides, setSides] = useState(() => pick(colors, "rojo", 2));
  const [text, setText] = useState("");
  const center = useMemo(() => pick(colors, "negro", 0), [colors]);
  const thread = useMemo(() => pick(colors, "blanco", 0), [colors]);
  const shape = seatShape(shapeId);
  const embroidery = text.trim() || shape.brand;
  const ids = useId();

  const look = useMemo<SeatLook>(
    () => ({
      shape: shapeId,
      center: center.hex,
      sides: sides.hex,
      stitch: sides.hex,
      pattern: "antideslizante",
      grip: "grueso",
      embroidery,
      thread: thread.hex,
      embroideryStyle: "recta"
    }),
    [shapeId, center, sides, embroidery, thread]
  );
  const lookRef = useRef(look);
  lookRef.current = look;

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    let cancelled = false;
    const fail = (error: unknown) => {
      console.error("Arma tu silla (inicio)", error);
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
            sceneRef.current = mountSeatScene(canvas, lookRef.current, {
              reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
              onReady: () => {
                if (!cancelled) setStatus("ready");
              },
              onError: fail
            });
          })
          .catch(fail);
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(stage);
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

  useEffect(() => {
    sceneRef.current?.update(look);
  }, [look]);

  const live = status !== "fallback";
  const params = new URLSearchParams({ forma: shapeId, lados: sides.name });
  if (text.trim()) params.set("bordado", text.trim());
  const href = `/arma-tu-silla?${params.toString()}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:items-center lg:gap-12">
      <div
        ref={stageRef}
        className="seat-stage relative aspect-[4/3] w-full overflow-hidden rounded-xl md:aspect-[16/11] lg:order-2"
        tabIndex={0}
        role="group"
        aria-roledescription="vista 3D"
        aria-label="Silla en 3D. Arrástrala o usa las flechas del teclado para girarla."
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
            loading="lazy"
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
        {live ? (
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white/85 backdrop-blur">
            Arrástrala para girarla
          </p>
        ) : null}
      </div>

      <div className="space-y-6 lg:order-1">
        <fieldset>
          <legend className="text-sm font-semibold text-ink-2">
            <span className="text-ink">1.</span> Tu tipo de moto
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-surface p-1">
            {SHAPE_OPTIONS.map((option) => {
              const selected = option.id === shapeId;
              return (
                <label
                  key={option.id}
                  className={cx(
                    "group flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md px-1 py-2 text-center text-xs font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                    selected ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"
                  )}
                >
                  <input
                    type="radio"
                    name={`${ids}-forma`}
                    value={option.id}
                    checked={selected}
                    onChange={() => setShapeId(option.id)}
                    className="sr-only"
                  />
                  <svg
                    viewBox={`0 0 ${SILHOUETTE_WIDTH} ${SILHOUETTE_HEIGHT}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="h-7 w-full max-w-20 transition-transform duration-150 ease-out group-active:scale-95"
                  >
                    <path d={option.path} fill="currentColor" />
                  </svg>
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-ink-2">
            <span className="text-ink">2.</span> Color de los costados: <span className="text-ink">{sides.name}</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((color) => {
              const selected = color.hex === sides.hex;
              return (
                <label
                  key={color.name}
                  title={color.name}
                  className={cx(
                    "relative grid size-11 cursor-pointer place-items-center rounded-full transition-transform duration-150 ease-out active:scale-95 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                    selected ? "ring-2 ring-ink ring-offset-2 ring-offset-bg" : "hover:scale-105"
                  )}
                >
                  <input
                    type="radio"
                    name={`${ids}-lados`}
                    value={color.name}
                    checked={selected}
                    onChange={() => setSides(color)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className="size-9 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                  <span className="sr-only">{color.name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor={`${ids}-bordado`} className="text-sm font-semibold text-ink-2">
            <span className="text-ink">3.</span> Bordado en el costado
          </label>
          <input
            id={`${ids}-bordado`}
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, EMBROIDERY_MAX))}
            maxLength={EMBROIDERY_MAX}
            placeholder={shape.brand}
            autoComplete="off"
            autoCapitalize="characters"
            className="mt-2 h-12 w-full rounded-lg border border-line-field bg-bg px-4 font-display text-base font-bold tracking-wide text-ink uppercase [font-stretch:75%] placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </div>

        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={href}>
            Seguir armando la mía
            <span aria-hidden="true">→</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
