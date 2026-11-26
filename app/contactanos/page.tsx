import type { Metadata } from "next";
import { ContactDetails } from "@/components/shared/contact-details";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses, megaTitleClasses } from "@/components/shared/section";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { getCarouselSlides } from "@/features/catalog/services/catalog.service";
import { ContactForm } from "@/features/contact/components/contact-form";
import { pageMetadata } from "@/lib/seo";
import { buildWhatsAppUrl, getSiteSettings, howtoSteps, quickMessages } from "@/lib/settings";
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
  // Un trabajo real del carrusel semanal detrás del título; nunca stock.
  const photo = slides.length > 2 ? slides[2] : (slides[slides.length - 1] ?? null);
  const whatsappHref = buildWhatsAppUrl(settings.whatsapp_number, settings.whatsapp_default_message);
  // Mensajes de un toque: se editan en el panel (Textos > Contacto).
  const quick = quickMessages(settings);

  return (
    <>
      <PageIntro
        title="Contáctanos"
        lead="Escríbenos por WhatsApp con la marca y el modelo de tu moto: te respondemos con el precio y las opciones."
        photo={photo ? { src: photo.image, alt: photo.alt } : null}
      >
        <Button asChild size="lg" className="mt-7 h-14 w-full px-7 text-lg sm:w-auto md:mt-9">
          <WhatsAppLink href={whatsappHref} source="contacto-cabecera">
            <WhatsAppIcon />
            Escribir por WhatsApp
          </WhatsAppLink>
        </Button>
        {quick.length ? (
          <div className="mt-7 md:mt-8">
            <p className="text-sm font-semibold text-white/75">O empieza con un toque:</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {quick.map((message) => (
                <li key={message}>
                  <WhatsAppLink
                    href={buildWhatsAppUrl(settings.whatsapp_number, `Hola MotoSmart. ${message}`)}
                    source="contacto-rapido"
                    reference={message}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-black/40 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-150 hover:border-white hover:bg-white hover:text-[#111] active:scale-[0.97]"
                  >
                    {message}
                    <span aria-hidden="true">→</span>
                  </WhatsAppLink>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </PageIntro>

      <div className={cn(containerClasses, "grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,36rem)_1fr] lg:items-start lg:gap-16")}>
        <section aria-labelledby="formulario">
          <h2 id="formulario" className="text-title">
            ¿Prefieres contarnos aquí?
          </h2>
          <p className="mt-2 text-ink-2">Llena esto y el mensaje se abre en WhatsApp, listo para enviar.</p>
          <Card className="mt-6">
            <ContactForm whatsappNumber={settings.whatsapp_number} />
          </Card>
        </section>
        <section aria-labelledby="otras-formas">
          <h2 id="otras-formas" className="text-title">
            Otras formas de contacto
          </h2>
          <ContactDetails className="mt-6" />
        </section>
      </div>

      <section aria-labelledby="como-funciona" data-theme="dark">
        <div className={cn(containerClasses, "py-14 md:py-20")}>
          <h2 id="como-funciona" className={megaTitleClasses}>
            Así funciona
          </h2>
          <ol className="mt-10 grid gap-x-8 border-t border-white/20 md:mt-12 md:grid-cols-3">
            {howtoSteps(settings).map((step, index) => (
              <li key={step.title} className="grid grid-cols-[4.5rem_1fr] gap-x-4 border-b border-white/15 py-6 md:block md:border-b-0 md:py-8">
                <span aria-hidden="true" className="type-display tabular row-span-2 text-6xl leading-[0.8] text-brand md:text-8xl">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-2xl leading-tight uppercase md:mt-6 md:text-3xl">{step.title}</h3>
                <p className="mt-1 text-ink-2 md:mt-2">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
