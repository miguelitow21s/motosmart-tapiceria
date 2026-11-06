import Link from "next/link";
import { InlinePrice } from "@/components/ui/price";
import { ScrollRow } from "@/components/shared/scroll-row";
import { SectionHeader } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import type { CarouselSlide } from "@/features/catalog/services/catalog.service";
import { cn } from "@/lib/utils";

/**
 * Una foto del carrusel semanal con su modelo y su precio en una etiqueta
 * sobre la foto, como en el héroe de escritorio. Así, a 390×844, la primera
 * tarjeta cabe entera con su precio en la primera pantalla.
 */
export function SlideCard({
  slide,
  priority = false,
  preloadMedia,
  className
}: {
  slide: CarouselSlide;
  priority?: boolean;
  preloadMedia?: string;
  className?: string;
}) {
  return (
    <Link href={slide.href} className={cn("group block w-[13.5rem] shrink-0 snap-start rounded-lg sm:w-64 lg:w-72", className)}>
      <div className="relative aspect-3/4 overflow-hidden rounded-lg bg-surface">
        <SmartImage
          src={slide.image}
          alt={slide.alt}
          sizes="(max-width: 639px) 216px, (max-width: 1023px) 256px, 288px"
          priority={priority}
          preloadMedia={preloadMedia}
          className="transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-2 bottom-2 rounded-md bg-bg px-3 py-2">
          <h3 className="line-clamp-2 text-base leading-tight sm:text-lg">{slide.title}</h3>
          {slide.design ? (
            <InlinePrice design={slide.design} />
          ) : slide.brandName ? (
            <p className="text-sm text-ink-2">{slide.brandName}</p>
          ) : null}
        </div>
      </div>
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
    // Arriba poco aire en el teléfono: la fila tiene que asomar en la primera pantalla.
    <section aria-labelledby="trabajos" className="pt-6 pb-10 md:py-14">
      <ScrollRow label="Trabajos de la semana" header={<SectionHeader id="trabajos" title="Trabajos de la semana" />}>
        {slides.map((slide, index) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            // Si la primera foto ya es la del héroe en escritorio, esta tarjeta
            // se oculta allí: se precarga solo en teléfono y tableta.
            priority={index === 0 && !featuredFirst}
            preloadMedia={index === 0 && featuredFirst ? "(max-width: 1023.98px)" : undefined}
            className={index === 0 && featuredFirst ? "lg:hidden" : undefined}
          />
        ))}
      </ScrollRow>
    </section>
  );
}
