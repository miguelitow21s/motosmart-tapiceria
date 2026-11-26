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

/** Lo que pasa después de escribir: así nadie se queda preguntando qué sigue. */
const STEPS = [
  { title: "Nos escribes", text: "Con tu moto (marca, modelo y año) y, si puedes, una foto de la silla como está hoy." },
  { title: "Te cotizamos", text: "Te mandamos el precio y las opciones de color, textura y bordado por WhatsApp." },
  { title: "Hacemos tu silla", text: "La hacemos a mano en Medellín. La instalas en el taller o te la enviamos." }
];

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
      <section aria-labelledby="como-funciona" className="border-t border-line">
        <div className={cn(containerClasses, "py-12 md:py-16")}>
          <h2 id="como-funciona" className="text-title">
            Así funciona
          </h2>
          <ol className="mt-8 grid gap-x-8 border-t-2 border-ink md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-b border-line py-5 md:block md:border-b-0 md:py-6">
                <span aria-hidden="true" className="type-display tabular row-span-2 text-4xl leading-none text-brand md:text-5xl">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-xl leading-tight md:mt-4">{step.title}</h3>
                <p className="mt-1 text-ink-2">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
