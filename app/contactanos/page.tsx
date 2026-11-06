import type { Metadata } from "next";
import { ContactDetails } from "@/components/shared/contact-details";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { Card } from "@/components/ui/card";
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
  const settings = await getSiteSettings();

  return (
    <>
      <PageIntro
        title="Contáctanos"
        lead="Cuéntanos qué moto tienes y qué quieres hacerle a la silla. El mensaje se abre en WhatsApp, listo para enviar."
      />
      <div className={cn(containerClasses, "grid gap-10 pb-14 md:pb-20 lg:grid-cols-[minmax(0,36rem)_1fr] lg:gap-16")}>
        <Card>
          <ContactForm whatsappNumber={settings.whatsapp_number} />
        </Card>
        <div>
          <h2 className="text-2xl">Otras formas de contacto</h2>
          <ContactDetails className="mt-5" />
        </div>
      </div>
    </>
  );
}
