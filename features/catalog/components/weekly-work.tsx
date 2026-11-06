import Link from "next/link";
import { InlinePrice } from "@/components/ui/price";
import { ScrollRow } from "@/components/shared/scroll-row";
import { SectionHeader } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import type { CarouselSlide } from "@/features/catalog/services/catalog.service";
import { cn } from "@/lib/utils";

/** Una foto del carrusel semanal con su modelo y su precio debajo. */
export function SlideCard({ slide, priority = false, className }: { slide: CarouselSlide; priority?: boolean; className?: string }) {
  return (
    <Link href={slide.href} className={cn("group block w-[15.5rem] shrink-0 snap-start rounded-lg sm:w-64 lg:w-72", className)}>
      <div className="relative aspect-3/4 overflow-hidden rounded-lg bg-surface">
        <SmartImage
          src={slide.image}
          alt={slide.alt}
          sizes="(max-width: 639px) 248px, (max-width: 1023px) 256px, 288px"
          priority={priority}
          className="transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <h3 className="mt-3 text-lg leading-tight">{slide.title}</h3>
      {slide.design ? (
        <InlinePrice design={slide.design} className="mt-0.5" />
      ) : slide.brandName ? (
        <p className="mt-0.5 text-sm text-ink-2">{slide.brandName}</p>
      ) : null}
    </Link>
  );
}

/**
 * "Trabajos de la semana": las fotos que la administradora marca en el
 * panel, en su orden. Con `featuredFirst`, la primera ya está grande en el
 * héroe de escritorio y aquí solo se muestra en pantallas angostas.
 */
export function WeeklyWork({ slides, featuredFirst = false }: { slides: CarouselSlide[]; featuredFirst?: boolean }) {
  if (!slides.length) return null;

  return (
    <section aria-labelledby="trabajos" className="py-10 md:py-14">
      <ScrollRow
        label="Trabajos de la semana"
        header={<SectionHeader id="trabajos" title="Trabajos de la semana" description="Toca una foto para ver el diseño y su precio." />}
      >
        {slides.map((slide, index) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            priority={index === 0}
            className={index === 0 && featuredFirst ? "lg:hidden" : undefined}
          />
        ))}
      </ScrollRow>
    </section>
  );
}
