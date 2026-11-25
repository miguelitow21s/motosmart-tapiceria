import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { containerClasses } from "@/components/shared/section";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

/**
 * Cierre de página: franja roja de marca, justo antes del pie negro, para
 * quien no encontró su moto. Es el único bloque rojo de cada página.
 * Contraste: blanco sobre el rojo 5,9:1; el botón es blanco con tinta encima.
 * Textos en /admin > "Textos" (closing_*).
 */
export async function ClosingCta() {
  const settings = await getSiteSettings();
  const href = buildWhatsAppUrl(settings.whatsapp_number, settings.whatsapp_default_message);

  return (
    <section aria-labelledby="cierre" className="bg-brand text-white [--focus:#fff]">
      <div
        className={cn(
          containerClasses,
          "flex flex-col gap-7 py-12 md:flex-row md:items-end md:justify-between md:gap-12 md:py-16"
        )}
      >
        <div className="max-w-3xl">
          <h2 id="cierre" className="text-[clamp(2rem,1.3rem+2.8vw,3.75rem)] leading-[0.98] uppercase">
            {settings.closing_title}
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-white">{settings.closing_text}</p>
        </div>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="w-full shrink-0 border-white bg-white text-[#111] hover:border-white hover:bg-[#f5f5f3] md:w-auto"
        >
          <WhatsAppLink href={href} source="cierre">
            <WhatsAppIcon />
            Cotizar por WhatsApp
          </WhatsAppLink>
        </Button>
      </div>
    </section>
  );
}
