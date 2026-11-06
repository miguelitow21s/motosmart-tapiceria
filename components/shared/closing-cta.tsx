import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { containerClasses } from "@/components/shared/section";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

/** Cierre de página: para quien no encontró su moto. Textos en /admin > "Textos" (closing_*). */
export async function ClosingCta() {
  const settings = await getSiteSettings();
  const href = buildWhatsAppUrl(settings.whatsapp_number, settings.whatsapp_default_message);

  return (
    <section aria-labelledby="cierre" className="border-t border-line bg-surface">
      <div
        className={cn(
          containerClasses,
          "flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:gap-10 md:py-16"
        )}
      >
        <div className="max-w-2xl">
          <h2 id="cierre" className="text-title">
            {settings.closing_title}
          </h2>
          <p className="mt-3 text-lg text-ink-2">{settings.closing_text}</p>
        </div>
        <Button asChild size="lg" className="w-full shrink-0 md:w-auto">
          <WhatsAppLink href={href} source="cierre">
            <WhatsAppIcon />
            Cotizar por WhatsApp
          </WhatsAppLink>
        </Button>
      </div>
    </section>
  );
}
