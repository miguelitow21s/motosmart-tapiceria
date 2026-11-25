"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { buildWhatsAppUrl } from "@/lib/settings-defaults";
import { cx } from "@/lib/utils";
import { SEAT_PATTERNS, seatQuoteMessage, type SeatColor } from "../lib/options";
import type { SeatLook, SeatScene } from "../lib/seat-scene";
import type { SeatPattern } from "../lib/textures";

type Status = "idle" | "loading" | "ready" | "fallback";

/** WebGL disponible y no apagado por el navegador. */
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
 * "Arma tu silla": la silla en 3D gira con el dedo; el cliente elige colores
 * y textura y manda la combinación por WhatsApp. El módulo de three.js se
 * descarga solo cuando la silla está por entrar en pantalla; mientras tanto (y
 * si el teléfono no tiene WebGL) se ve la foto fija de la misma silla.
 */
export function SeatConfigurator({
  colors,
  whatsappNumber,
  poster
}: {
  colors: SeatColor[];
  whatsappNumber: string;
  poster?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SeatScene | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [touched, setTouched] = useState(false);
  const [center, setCenter] = useState(() => pick(colors, "negro", 0));
  const [sides, setSides] = useState(() => pick(colors, "rojo", 2));
  const [stitch, setStitch] = useState(() => pick(colors, "rojo", 2));
  const [pattern, setPattern] = useState<SeatPattern>("rombos");
  const [moto, setMoto] = useState("");
  const motoId = useId();

  const look = useMemo<SeatLook>(
    () => ({ center: center.hex, sides: sides.hex, stitch: stitch.hex, pattern }),
    [center, sides, stitch, pattern]
  );
  const lookRef = useRef(look);
  lookRef.current = look;

  // Carga perezosa: three.js (~150 kB) solo cuando la silla se acerca.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    let cancelled = false;
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
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            sceneRef.current = mountSeatScene(canvas, lookRef.current, {
              reducedMotion,
              onReady: () => {
                if (!cancelled) setStatus("ready");
              }
            });
          })
          .catch((error: unknown) => {
            console.error("Arma tu silla", error);
            if (!cancelled) setStatus("fallback");
          });
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(stage);
    return () => {
      cancelled = true;
      observer.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.update(look);
  }, [look]);

  const patternLabel = SEAT_PATTERNS.find((item) => item.id === pattern)?.label ?? pattern;
  const href = buildWhatsAppUrl(
    whatsappNumber,
    seatQuoteMessage({ center: center.name, sides: sides.name, stitch: stitch.name, pattern: patternLabel, moto })
  );

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center lg:gap-10 xl:grid-cols-[minmax(0,1fr)_24rem]">
      {/* En el teléfono la silla se queda fija bajo la cabecera mientras se
          eligen los colores: cada cambio se ve sin volver a subir. El fondo
          del contenedor tapa lo que pasa por detrás en las esquinas. */}
      <div className="z-10 bg-bg pb-3 max-lg:sticky max-lg:top-[calc(3.5rem+env(safe-area-inset-top))] lg:pb-0">
      <div
        ref={stageRef}
        className="seat-stage relative aspect-[4/3] overflow-hidden rounded-xl md:aspect-[16/11]"
        tabIndex={0}
        role="group"
        aria-roledescription="vista 3D"
        aria-label="Silla en 3D. Arrástrala o usa las flechas del teclado para girarla."
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            sceneRef.current?.rotateBy(event.key === "ArrowLeft" ? -0.3 : 0.3);
            setTouched(true);
          }
        }}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagen local fija, ya optimizada
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            className={cx(
              "absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
              status === "ready" ? "opacity-0" : "opacity-100"
            )}
          />
        ) : null}
        <canvas
          ref={canvasRef}
          className={cx(
            "absolute inset-0 h-full w-full cursor-grab touch-pan-y transition-opacity duration-500 active:cursor-grabbing",
            status === "ready" ? "opacity-100" : "opacity-0"
          )}
          onPointerDown={() => setTouched(true)}
        />
        <p
          aria-hidden="true"
          className={cx(
            "pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 backdrop-blur transition-opacity duration-300",
            status === "ready" && !touched ? "opacity-100" : "opacity-0"
          )}
        >
          Arrástrala para girarla
        </p>
      </div>
      </div>

      <form className="grid gap-5" onSubmit={(event) => event.preventDefault()}>
        <Swatches legend="Centro" colors={colors} value={center} onChange={setCenter} />
        <fieldset>
          <legend className="text-sm font-semibold text-ink-2">Textura del centro</legend>
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-surface p-1">
            {SEAT_PATTERNS.map((item) => (
              <label
                key={item.id}
                className={cx(
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                  pattern === item.id ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"
                )}
              >
                <input
                  type="radio"
                  name="textura"
                  value={item.id}
                  checked={pattern === item.id}
                  onChange={() => setPattern(item.id)}
                  className="sr-only"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Swatches legend="Costados" colors={colors} value={sides} onChange={setSides} />
        <Swatches legend="Costura" colors={colors} value={stitch} onChange={setStitch} />
        <div>
          <label htmlFor={motoId} className="text-sm font-semibold text-ink-2">
            Tu moto <span className="font-normal text-ink-3">(opcional)</span>
          </label>
          <input
            id={motoId}
            value={moto}
            onChange={(event) => setMoto(event.target.value.slice(0, 60))}
            placeholder="Ej.: Yamaha NMAX 2023"
            autoComplete="off"
            className="mt-2 h-12 w-full rounded-lg border border-line-field bg-bg px-4 text-base text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </div>
        <Button asChild size="lg" className="w-full">
          <WhatsAppLink href={href} source="arma-tu-silla">
            <WhatsAppIcon />
            Cotizar esta silla
          </WhatsAppLink>
        </Button>
        <p className="text-sm text-ink-3">Vista de referencia. Tu silla se corta y se cose a la medida de tu moto.</p>
      </form>
    </div>
  );
}

function Swatches({
  legend,
  colors,
  value,
  onChange
}: {
  legend: string;
  colors: SeatColor[];
  value: SeatColor;
  onChange: (color: SeatColor) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink-2">
        {legend}: <span className="text-ink">{value.name}</span>
      </legend>
      <div className="mt-2 flex flex-wrap sm:gap-1">
        {colors.map((color) => {
          const selected = color.name === value.name;
          return (
            <label
              key={color.name}
              title={color.name}
              className="group relative grid size-11 cursor-pointer place-items-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-ink"
            >
              <input
                type="radio"
                name={name}
                value={color.name}
                checked={selected}
                onChange={() => onChange(color)}
                className="sr-only"
                aria-label={color.name}
              />
              <span
                aria-hidden="true"
                className={cx(
                  "size-8 rounded-full ring-1 ring-white/15 transition-transform duration-150 ease-out ring-inset group-active:scale-90",
                  selected ? "scale-100 outline-2 outline-offset-2 outline-ink" : "scale-90 group-hover:scale-100"
                )}
                style={{ backgroundColor: color.hex }}
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
