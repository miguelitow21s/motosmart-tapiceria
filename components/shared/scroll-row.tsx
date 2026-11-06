"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { containerClasses } from "@/components/shared/section";
import { cn } from "@/lib/utils";

/**
 * Fila horizontal con scroll-snap nativo: en el teléfono se desliza con el
 * dedo y la siguiente foto asoma por el borde; con mouse aparecen flechas de
 * 44 px. Nada se mueve solo.
 */
export function ScrollRow({ header, label, children }: { header: ReactNode; label: string; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      const start = el.scrollLeft <= 4;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  function page(direction: -1 | 1) {
    const el = trackRef.current;
    if (!el || (direction === -1 ? edges.start : edges.end)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div>
      <div className={cn(containerClasses, "flex items-end justify-between gap-4")}>
        {header}
        <div className="hidden shrink-0 gap-2 md:flex">
          {/* aria-disabled y no disabled: al llegar al final, el foco no salta al <body>. */}
          <Button variant="secondary" size="icon" aria-label="Ver anteriores" aria-disabled={edges.start} onClick={() => page(-1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Ver siguientes" aria-disabled={edges.end} onClick={() => page(1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="bleed-row no-scrollbar mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 sm:gap-4"
      >
        {children}
      </div>
    </div>
  );
}
