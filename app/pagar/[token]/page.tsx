import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { ChargeForm } from "@/features/payments/components/checkout-form";
import { findOrderByToken } from "@/features/payments/server/orders";
import { isPaidStatus, type Order } from "@/features/payments/types";
import { arePaymentsReady } from "@/lib/feature-flags";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatCOP } from "@/lib/utils";
import { cn } from "@/lib/cn";
import { demoOrder } from "@/features/payments/server/demo";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagar",
  robots: { index: false, follow: false }
};

async function loadOrder(token: string): Promise<Order | null> {
  // En local con ADMIN_DEMO=1 no se lee la base de producción: un cobro de muestra.
  if (process.env.ADMIN_DEMO === "1") return demoOrder(token);
  return findOrderByToken(createAdminSupabaseClient(), token);
}

/** Enlace de un cobro que Natalia armó en el panel y mandó por WhatsApp. */
export default async function PayPage({ params }: Props) {
  const { token } = await params;
  const [order, ready, settings] = await Promise.all([loadOrder(token), arePaymentsReady(), getSiteSettings()]);
  const help = buildWhatsAppUrl(
    settings.whatsapp_number,
    order ? `Hola MotoSmart, tengo una pregunta sobre el cobro ${order.code}.` : "Hola MotoSmart, tengo un problema con un enlace de pago."
  );

  if (!order || order.kind === "manual") {
    return (
      <Message title="Enlace no encontrado" text="Este enlace de pago no existe o está incompleto. Escríbenos y te mandamos uno nuevo." help={help} />
    );
  }
  if (isPaidStatus(order.status)) {
    return (
      <Message
        title="Ya está pagado"
        text={`El cobro ${order.code} por ${formatCOP(order.amount_cop)} ya está pagado. ¡Gracias!`}
        help={help}
        done
      />
    );
  }
  if (order.status === "cancelado") {
    return <Message title="Cobro cancelado" text="Este cobro fue cancelado. Si es un error, escríbenos." help={help} />;
  }

  return (
    <>
      <PageIntro
        title="Tu pago"
        lead={[
          order.customer_name ? `Hola, ${order.customer_name.split(" ")[0]}.` : null,
          order.kind === "tienda" ? "Este es tu pedido: puedes pagarlo aquí." : "Este es el cobro que te armamos."
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <div className={cn(containerClasses, "py-10 md:py-14")}>
        <div className="mx-auto max-w-lg">
          <dl className="rounded-lg border border-line">
            <div className="border-b border-line px-5 py-4">
              <dt className="text-sm text-ink-2">Concepto</dt>
              <dd className="mt-1 text-lg font-semibold text-ink">{order.description}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-5 py-4">
              <dt className="text-sm text-ink-2">Total</dt>
              <dd className="tabular type-display text-3xl text-ink">{formatCOP(order.amount_cop)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-ink-3">Código {order.code}</p>
          <div className="mt-8">
            {ready ? (
              <ChargeForm token={token} amount={order.amount_cop} />
            ) : (
              <p role="status" className="text-ink-2">
                Los pagos en línea no están disponibles en este momento. Escríbenos por WhatsApp y te ayudamos a pagar.
              </p>
            )}
          </div>
          <p className="mt-6 text-sm text-ink-2">{settings.payment_note}</p>
          <p className="mt-6">
            <WhatsAppLink href={help} source="pagar" className="link-underline text-sm font-semibold">
              ¿Dudas? Escríbenos por WhatsApp
            </WhatsAppLink>
          </p>
        </div>
      </div>
    </>
  );
}

function Message({ title, text, help, done = false }: { title: string; text: string; help: string; done?: boolean }) {
  return (
    <>
      <PageIntro title={title} lead={text} />
      <div className={cn(containerClasses, "py-10 md:py-14")}>
        {done ? (
          <p className="mb-6 flex items-center gap-2 font-semibold text-ink">
            <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
            Recibimos tu pago
          </p>
        ) : null}
        <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
          <WhatsAppLink href={help} source="pagar">
            <WhatsAppIcon />
            Escribir por WhatsApp
          </WhatsAppLink>
        </Button>
      </div>
    </>
  );
}
