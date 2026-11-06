import Link from "next/link";
import { ClosingCta } from "@/components/shared/closing-cta";
import { Hero } from "@/components/shared/hero";
import { Section, SectionHeader, containerClasses } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import { BrandBar } from "@/features/catalog/components/brand-bar";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { WeeklyWork } from "@/features/catalog/components/weekly-work";
import { getBrands, getCarouselSlides, getFeaturedDesigns } from "@/features/catalog/services/catalog.service";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [brands, featuredDesigns, slides, settings] = await Promise.all([
    getBrands(),
    getFeaturedDesigns(),
    getCarouselSlides(),
    getSiteSettings()
  ]);

  const featured = slides[0] ?? null;
  // Para el bloque de servicios, la foto más lejos de la primera (que ya
  // está en el héroe y abre la fila de trabajos).
  const servicesPhoto = slides.length > 1 ? slides[slides.length - 1] : null;
  const services = [
    { title: settings.service_1_title, text: settings.service_1_text },
    { title: settings.service_2_title, text: settings.service_2_text },
    { title: settings.service_3_title, text: settings.service_3_text }
  ];

  return (
    <>
      <Hero featured={featured} />
      <BrandBar brands={brands} />
      <WeeklyWork slides={slides} featuredFirst />

      {featuredDesigns.length ? (
        <Section aria-labelledby="sillas" className="pt-4 md:pt-6">
          <SectionHeader
            id="sillas"
            title="Sillas por marca"
            description="Un diseño de cada marca con su precio de referencia."
            action={
              <Link href="/catalogo" className="link-underline inline-flex min-h-11 items-center font-semibold">
                Ver catálogo completo
              </Link>
            }
          />
          <div className="mt-6">
            <DesignGrid designs={featuredDesigns} maxColumns={featuredDesigns.length % 4 === 0 ? 4 : 3} />
          </div>
        </Section>
      ) : null}

      <section aria-labelledby="servicios" className="border-t border-line">
        <div
          className={cn(
            containerClasses,
            "grid gap-8 py-12 md:py-16",
            servicesPhoto && "lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-center lg:gap-16"
          )}
        >
          {servicesPhoto ? (
            <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-surface lg:aspect-3/4">
              <SmartImage src={servicesPhoto.image} alt={servicesPhoto.alt} sizes="(min-width: 1024px) 416px, 100vw" />
            </div>
          ) : null}
          <div>
            <h2 id="servicios" className="text-title">
              {settings.services_title}
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-ink-2">{settings.services_text}</p>
            <dl className="mt-8 divide-y divide-line border-y border-line">
              {services.map((service) => (
                <div key={service.title} className="grid gap-1 py-5 sm:grid-cols-[13rem_1fr] sm:gap-6">
                  <dt className="type-display text-xl leading-tight">{service.title}</dt>
                  <dd className="text-ink-2">{service.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <ClosingCta />
    </>
  );
}
