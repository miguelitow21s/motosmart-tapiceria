import type { Metadata } from "next";
import { ContactDetails } from "@/components/shared/contact-details";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import { Card } from "@/components/ui/card";
import { getCarouselSlides } from "@/features/catalog/services/catalog.service";
import { ContactForm } from "@/features/contact/components/contact-form";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Contáctanos: tapicería para moto en Medellín",
    description: "Cotiza tu tapicería de moto por WhatsApp: cuéntanos tu marca y modelo y te respondemos con el precio.",
    path: "/contactanos"
  });
}

export default async function ContactanosPage() {
  const [settings, slides] = await Promise.all([getSiteSettings(), getCarouselSlides()]);
  // Un trabajo real del carrusel semanal junto a los datos; nunca stock.
  const photo = slides.length > 2 ? slides[2] : (slides[slides.length - 1] ?? null);

  return (
    <>
      <PageIntro
        title="Contáctanos"
        lead="Cuéntanos qué moto tienes y qué quieres hacerle a la silla. El mensaje se abre en WhatsApp, listo para enviar."
      />
      <div className={cn(containerClasses, "grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,36rem)_1fr] lg:items-start lg:gap-16")}>
        <Card>
          <ContactForm whatsappNumber={settings.whatsapp_number} />
        </Card>
        <div>
          <h2 className="text-title">Otras formas de contacto</h2>
          <ContactDetails className="mt-6" />
          {photo ? (
            <div className="relative mt-10 hidden aspect-4/3 overflow-hidden rounded-lg bg-surface lg:block">
              <SmartImage src={photo.image} alt={photo.alt} sizes="(min-width: 1280px) 600px, 45vw" />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
