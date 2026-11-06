import type { Metadata } from "next";
import { ClosingCta } from "@/components/shared/closing-cta";
import { ContactDetails } from "@/components/shared/contact-details";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import { getCarouselSlides } from "@/features/catalog/services/catalog.service";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

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
  // Dos trabajos reales del carrusel semanal; nunca fotos de stock.
  const photos = slides.slice(1, 3).length === 2 ? slides.slice(1, 3) : slides.slice(0, 2);

  return (
    <>
      <PageIntro title="Sobre nosotros" />
      <div
        className={cn(
          containerClasses,
          "grid gap-10 pb-12 md:pb-16",
          photos.length && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
        )}
      >
        <div>
          <p className="max-w-[60ch] text-lg leading-relaxed text-ink-2">{settings.about_description}</p>
          <h2 className="mt-10 text-2xl">{settings.business_district ? "Dónde encontrarnos" : "Cómo contactarnos"}</h2>
          <ContactDetails className="mt-5" />
        </div>
        {photos.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-3/4 overflow-hidden rounded-lg bg-surface">
                <SmartImage src={photo.image} alt={photo.alt} sizes="(min-width: 1024px) 300px, 50vw" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <ClosingCta />
    </>
  );
}
