import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Agenda tu instalación",
  robots: { index: false, follow: false }
};

/**
 * Todavía no hay pago en línea: el pedido se cierra por WhatsApp.
 * La página existe detrás del módulo checkout_enabled.
 */
export default async function CheckoutPage() {
  const enabled = await isFeatureEnabled("checkout_enabled");
  if (!enabled) redirect("/");
  const settings = await getSiteSettings();
  const href = buildWhatsAppUrl(
    settings.whatsapp_number,
    "Hola MotoSmart, quiero agendar la instalación de mi silla."
  );

  return (
    <>
      <PageIntro
        title="Agenda tu instalación"
        lead="Escríbenos con el diseño que elegiste y tu moto. Te confirmamos el precio final, el abono y el día de instalación en el taller."
      />
      <div className={cn(containerClasses, "pb-16 md:pb-24")}>
        <Button asChild size="lg">
          <WhatsAppLink href={href} source="checkout">
            <WhatsAppIcon />
            Agendar por WhatsApp
          </WhatsAppLink>
        </Button>
      </div>
    </>
  );
}
