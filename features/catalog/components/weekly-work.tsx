import Link from "next/link";
import { InlinePrice } from "@/components/ui/price";
import { ScrollRow } from "@/components/shared/scroll-row";
import { SectionHeader } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import type { CarouselSlide } from "@/features/catalog/services/catalog.service";

/** Una foto del carrusel semanal con su modelo y su precio en una etiqueta sobre la foto, como en el héroe. */
export function SlideCard({ slide }: { slide: CarouselSlide }) {
  return (
    <Link href={slide.href} className="group block w-[13.5rem] shrink-0 snap-start rounded-lg sm:w-64 lg:w-72">
      <div className="relative aspect-3/4 overflow-hidden rounded-lg bg-surface">
        <SmartImage
          src={slide.image}
          alt={slide.alt}
          sizes="(max-width: 639px) 216px, (max-width: 1023px) 256px, 288px"
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
 * "Trabajos de la semana": las fotos que la administradora marca en el panel,
 * en su orden. El inicio pasa todas menos la primera, que ya va grande en el
 * héroe; sin fotos que mostrar, la sección no sale.
 */
export function WeeklyWork({ slides }: { slides: CarouselSlide[] }) {
  if (!slides.length) return null;

  return (
    <section aria-labelledby="trabajos" className="py-10 md:py-14">
      <ScrollRow label="Trabajos de la semana" header={<SectionHeader id="trabajos" title="Trabajos de la semana" />}>
        {slides.map((slide) => (
          <SlideCard key={slide.id} slide={slide} />
        ))}
      </ScrollRow>
    </section>
  );
}
