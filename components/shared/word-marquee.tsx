"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { cx } from "@/lib/utils";

/**
 * Franja de palabras gigantes que corre de lado (las marcas que trabaja el
 * taller). Es decoración: los lectores de pantalla leen la lista una vez y el
 * movimiento se puede pausar (WCAG 2.2.2), se detiene con el puntero encima y
 * con «reducir movimiento» queda quieta.
 */
export function WordMarquee({ words, label, className }: { words: string[]; label: string; className?: string }) {
  const [paused, setPaused] = useState(false);
  if (!words.length) return null;
  // Dos copias seguidas: al llegar a la mitad, la segunda ocupa el lugar de la primera y el salto no se ve.
  const run = [...words, ...words];

  return (
    <div data-theme="dark" data-paused={paused || undefined} className={cx("marquee relative overflow-hidden border-y border-line py-4 md:py-6", className)}>
      <p className="sr-only">{label}: {words.join(", ")}.</p>
      <div aria-hidden="true" className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {run.map((word, index) => (
              <li key={`${word}-${index}`} className="flex items-center">
                <span
                  className={cx(
                    "type-display px-5 text-[clamp(2.75rem,1.6rem+5vw,6.5rem)] leading-none whitespace-nowrap uppercase md:px-8",
                    index % 2 ? "marquee-outline" : "text-ink"
                  )}
                >
                  {word}
                </span>
                <span className="size-3 shrink-0 rotate-45 bg-brand md:size-4" />
              </li>
            ))}
          </ul>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        aria-label={paused ? "Mover la franja" : "Pausar la franja"}
        className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/85 text-ink-2 backdrop-blur transition-colors hover:text-ink motion-reduce:hidden md:right-4"
      >
        {paused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}
