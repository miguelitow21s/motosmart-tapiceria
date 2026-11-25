import type { Metadata } from "next";
import { ClosingCta } from "@/components/shared/closing-cta";
import { ContactDetails } from "@/components/shared/contact-details";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { ServicesList } from "@/components/shared/services-list";
import { SmartImage } from "@/components/shared/smart-image";
import { getCarouselSlides } from "@/features/catalog/services/catalog.service";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const slides = await getCarouselSlides();
  return pageMetadata({
    title: "Sobre nosotros: tapicería para moto en Medellín",
    description: "Conoce a MotoSmart, tapicería para moto en Medellín: quiénes somos, dónde estamos y cómo cotizar tu silla.",
    path: "/sobre-nosotros",
    image: slides[1]?.image ?? slides[0]?.image,
    imageAlt: slides[1]?.alt ?? slides[0]?.alt
  });
}

export default async function SobreNosotrosPage() {
  const [settings, slides] = await Promise.all([getSiteSettings(), getCarouselSlides()]);
  // Tres trabajos reales del carrusel semanal (sin la primera, que abre el
  // inicio); nunca fotos de stock.
  const photos = (slides.length > 3 ? slides.slice(1) : slides).slice(0, 3);

  return (
    <>
      <PageIntro title="Sobre nosotros" lead={settings.about_description} />

      {photos.length ? (
        // La franja de fotos sigue en el escenario negro de la cabecera.
        <div data-theme="dark">
          <ul
            className={cn(
              containerClasses,
              "grid gap-3 pb-10 sm:gap-4 md:pb-14",
              photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"
            )}
          >
            {photos.map((photo, index) => (
              <li
                key={photo.id}
                className={cn(
                  "relative overflow-hidden rounded-lg bg-surface",
                  photos.length === 3 && index === 0 ? "col-span-2 aspect-4/3 md:col-span-1 md:aspect-3/4" : "aspect-3/4"
                )}
              >
                <SmartImage
                  src={photo.image}
                  alt={photo.alt}
                  sizes={photos.length === 3 && index === 0 ? "(min-width: 768px) 33vw, 100vw" : "(min-width: 768px) 33vw, 50vw"}
                  priority={index === 0}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={cn(containerClasses, "grid gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16")}>
        <section aria-labelledby="que-hacemos">
          <h2 id="que-hacemos" className="text-title">
            {settings.services_title}
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-ink-2">{settings.services_text}</p>
          <ServicesList settings={settings} className="mt-8" />
        </section>
        <section aria-labelledby="donde">
          <h2 id="donde" className="text-title">
            {settings.business_district ? "Dónde encontrarnos" : "Cómo contactarnos"}
          </h2>
          <ContactDetails className="mt-6" />
        </section>
      </div>
      <ClosingCta />
    </>
  );
}
