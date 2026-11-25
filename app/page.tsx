import type { Metadata } from "next";
import Link from "next/link";
import { ClosingCta } from "@/components/shared/closing-cta";
import { Hero } from "@/components/shared/hero";
import { Section, SectionHeader, containerClasses } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import { BrandBar } from "@/features/catalog/components/brand-bar";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { WeeklyWork } from "@/features/catalog/components/weekly-work";
import { getBrands, getCarouselSlides, getFeaturedDesigns, getStoreDesigns } from "@/features/catalog/services/catalog.service";
import { ConfiguratorTeaser } from "@/features/configurator/components/configurator-teaser";
import { isCustomizerEnabled } from "@/lib/feature-flags";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings, type SiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, slides] = await Promise.all([getSiteSettings(), getCarouselSlides()]);
  return pageMetadata({
    title: settings.meta_title,
    description: settings.meta_description,
    path: "/",
    image: slides[0]?.image,
    imageAlt: slides[0]?.alt,
    absoluteTitle: true
  });
}

/**
 * Ficha de negocio local para Google. La dirección solo sale si el panel tiene
 * el barrio: nunca se inventa. Teléfono e Instagram salen de los mismos datos
 * que ve el cliente.
 */
function businessJsonLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: settings.business_name,
    description: settings.meta_description,
    url: siteConfig.url,
    image: `${siteConfig.url}/logo-motosmart.png`,
    logo: `${siteConfig.url}/logo-motosmart.png`,
    telephone: `+${settings.whatsapp_number.replace(/\D/g, "")}`,
    currenciesAccepted: "COP",
    areaServed: [
      { "@type": "City", name: "Medellín" },
      { "@type": "Country", name: "Colombia" }
    ],
    ...(settings.business_district
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: settings.business_district,
            addressLocality: "Medellín",
            addressRegion: "Antioquia",
            addressCountry: "CO"
          }
        }
      : {}),
    ...(settings.instagram_url ? { sameAs: [settings.instagram_url] } : {})
  };
}

export default async function HomePage() {
  const [brands, featuredDesigns, designs, slides, settings, customizerOn] = await Promise.all([
    getBrands(),
    getFeaturedDesigns(),
    getStoreDesigns(),
    getCarouselSlides(),
    getSiteSettings(),
    isCustomizerEnabled()
  ]);

  const featured = slides[0] ?? null;
  // Para el bloque de servicios, la foto más lejos de la primera (que ya
  // está en el héroe).
  const servicesPhoto = slides.length > 1 ? slides[slides.length - 1] : null;
  const services = [
    { title: settings.service_1_title, text: settings.service_1_text },
    { title: settings.service_2_title, text: settings.service_2_text },
    { title: settings.service_3_title, text: settings.service_3_text }
  ];

  return (
    <>
      <JsonLd data={businessJsonLd(settings)} />
      <Hero featured={featured} designCount={designs.length} brandCount={brands.length} />
      <BrandBar brands={brands} />
      <WeeklyWork slides={slides.slice(1)} />

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

      {customizerOn ? <ConfiguratorTeaser /> : null}

      <section aria-labelledby="servicios" className={cn(!customizerOn && "border-t border-line")}>
        <div
          className={cn(
            containerClasses,
            "grid gap-8 py-12 md:py-20",
            servicesPhoto && "lg:grid-cols-[minmax(0,28rem)_1fr] lg:items-center lg:gap-16"
          )}
        >
          <div className={cn(servicesPhoto && "lg:col-start-2")}>
            <h2 id="servicios" className="text-title">
              {settings.services_title}
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-ink-2">{settings.services_text}</p>
            <ol className="mt-8 border-t-2 border-ink">
              {services.map((service, index) => (
                <li
                  key={service.title}
                  className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-b border-line py-5 sm:grid-cols-[4.5rem_13rem_1fr] sm:gap-x-6"
                >
                  <span aria-hidden="true" className="type-display tabular row-span-2 text-4xl leading-none text-brand sm:row-span-1 sm:text-5xl">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-xl leading-tight">{service.title}</h3>
                  <p className="text-ink-2">{service.text}</p>
                </li>
              ))}
            </ol>
          </div>
          {servicesPhoto ? (
            <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-surface lg:col-start-1 lg:row-start-1 lg:aspect-3/4">
              <SmartImage src={servicesPhoto.image} alt={servicesPhoto.alt} sizes="(min-width: 1024px) 448px, 100vw" />
            </div>
          ) : null}
        </div>
      </section>

      <ClosingCta />
    </>
  );
}
