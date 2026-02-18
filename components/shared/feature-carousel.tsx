"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SmartImage } from "@/components/shared/smart-image";

const slides = [
  {
    title: "Costuras de alto contraste",
    description: "Hilos reforzados y patrones deportivos para un look agresivo y duradero.",
    image:
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Acabados antideslizantes",
    description: "Materiales con agarre superior para confort y control en cualquier clima.",
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Diseño a dos tonos",
    description: "Combinaciones personalizadas que resaltan la silueta de tu moto.",
    image:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1600&q=80"
  }
];

export function FeatureCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-card md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Detalle y acabado</p>
          <h3 className="font-display text-2xl text-white">Trabajos recientes</h3>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:border-white/30 hover:bg-white/10"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:border-white/30 hover:bg-white/10"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.title}
            className="group relative w-72 flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-black/50"
            style={{ "--i": idx } as React.CSSProperties}
          >
            <div className="relative h-44 w-full">
              <SmartImage src={slide.image} alt={slide.title} fill priority={idx === 0} />
            </div>
            <div className="space-y-1 p-4" data-animate-text>
              <h4 className="font-display text-lg text-white" style={{ "--i": 0 } as React.CSSProperties}>
                {slide.title}
              </h4>
              <p className="text-sm text-neutral-300" style={{ "--i": 1 } as React.CSSProperties}>
                {slide.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
