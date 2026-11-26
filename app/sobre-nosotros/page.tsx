import type { Metadata } from "next";
import Link from "next/link";
import { ClosingCta } from "@/components/shared/closing-cta";
import { ContactDetails } from "@/components/shared/contact-details";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { ServicesList } from "@/components/shared/services-list";
import { SmartImage } from "@/components/shared/smart-image";
import { getCarouselSlides } from "@/features/catalog/services/catalog.service";
import { SeatProcess } from "@/features/configurator/components/seat-process";
import { isCustomizerEnabled } from "@/lib/feature-flags";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings, processSteps } from "@/lib/settings";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const slides = await getCarouselSlides();
  return pageMetadata({
    title: "Sobre nosotros: tapicería para moto en Medellín",
    description:
      "Conoce a MotoSmart, tapicería para moto en Medellín: cómo hacemos cada silla, de la base a la marca bordada, y cómo cotizar la tuya.",
    path: "/sobre-nosotros",
    image: slides[1]?.image ?? slides[0]?.image,
    imageAlt: slides[1]?.alt ?? slides[0]?.alt
  });
}

/** Foto fija del despiece, con el mismo encuadre que el 3D (4:3 en el teléfono, 16:11 desde tableta). */
const PROCESS_POSTER = { narrow: "/arma-tu-silla/despiece-movil.webp", wide: "/arma-tu-silla/despiece.webp" };

export default async function SobreNosotrosPage() {
  const [settings, slides, customizerOn] = await Promise.all([
    getSiteSettings(),
    getCarouselSlides(),
    isCustomizerEnabled({ onError: "open" })
  ]);
  // Tres trabajos reales del carrusel semanal (sin la primera, que abre el
  // inicio); nunca fotos de stock. Una cuarta acompaña los servicios.
  const pool = slides.length > 3 ? slides.slice(1) : slides;
  const photos = pool.slice(0, 3);
  const servicePhoto = pool[3] ?? null;
  const hasPlace = Boolean(settings.business_district || settings.business_hours);

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

      <section aria-labelledby="como-se-hace" className={cn(containerClasses, "py-12 md:py-20")}>
        <div className="max-w-2xl">
          <h2 id="como-se-hace" className="text-title">
            Así se hace tu silla
          </h2>
          <p className="mt-3 text-lg text-ink-2">
            Cuatro capas, de la base a la marca bordada. Elige un paso para verlo armarse en 3D.
          </p>
        </div>
        <div className="mt-8 md:mt-10">
          <SeatProcess poster={PROCESS_POSTER} steps={processSteps(settings)} />
        </div>
        {customizerOn ? (
          <p className="mt-6">
            <Link href="/arma-tu-silla" className="link-underline inline-flex min-h-11 items-center font-semibold">
              Arma la tuya con tus colores →
            </Link>
          </p>
        ) : null}
      </section>

      <div className="border-t border-line">
        <div
          className={cn(
            containerClasses,
            "grid gap-12 py-12 md:py-16",
            (servicePhoto || hasPlace) && "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16"
          )}
        >
          <section aria-labelledby="que-hacemos">
            <h2 id="que-hacemos" className="text-title">
              {settings.services_title}
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-ink-2">{settings.services_text}</p>
            <ServicesList settings={settings} className="mt-8" />
          </section>
          {hasPlace ? (
            // Barrio y horario, si Natalia los escribió en el panel; el resto ya está en el pie.
            <section aria-labelledby="donde">
              <h2 id="donde" className="text-title">
                Dónde encontrarnos
              </h2>
              <ContactDetails className="mt-6" />
            </section>
          ) : servicePhoto ? (
            <div className="relative hidden aspect-3/4 overflow-hidden rounded-lg bg-surface lg:block">
              <SmartImage src={servicePhoto.image} alt={servicePhoto.alt} sizes="(min-width: 1280px) 480px, 38vw" />
            </div>
          ) : null}
        </div>
      </div>
      <ClosingCta />
    </>
  );
}
