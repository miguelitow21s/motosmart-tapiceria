import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { applyTransaction, findOrderByToken, latestAttempt } from "@/features/payments/server/orders";
import { isPaidStatus, methodLabel, type Order, type PaymentAttempt } from "@/features/payments/types";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatCOP } from "@/lib/utils";
import { fetchTransaction, wompiConfig } from "@/lib/wompi";
import { cn } from "@/lib/cn";
import { demoOrder } from "@/features/payments/server/demo";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resultado del pago",
  robots: { index: false, follow: false }
};

type Outcome = "aprobado" | "pendiente" | "rechazado" | "desconocido";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/**
 * Al volver de Wompi (?pedido=<token>&id=<transacción>). No se cree en la URL:
 * se le pregunta a Wompi por la transacción y, si es de este pedido, se
 * aplica igual que si hubiera llegado el evento (el evento puede tardar).
 */
async function resolve(token: string, transactionId: string): Promise<{ order: Order | null; attempt: PaymentAttempt | null }> {
  const supabase = createAdminSupabaseClient();
  const order = await findOrderByToken(supabase, token);
  if (!order) return { order: null, attempt: null };
  const config = wompiConfig();
  if (config && transactionId && !isPaidStatus(order.status)) {
    const tx = await fetchTransaction(config, transactionId);
    if (tx && tx.reference.startsWith(`${order.code}-`)) {
      try {
        await applyTransaction(supabase, tx, config.environment, tx);
      } catch (error) {
        console.error("pago/resultado", error instanceof Error ? error.message : error);
      }
    }
  }
  const [fresh, attempt] = await Promise.all([findOrderByToken(supabase, token), latestAttempt(supabase, order.id)]);
  return { order: fresh, attempt };
}

function outcomeOf(order: Order | null, attempt: PaymentAttempt | null): Outcome {
  if (!order) return "desconocido";
  if (isPaidStatus(order.status)) return "aprobado";
  if (!attempt || attempt.status === "PENDING") return "pendiente";
  return "rechazado";
}

const COPY: Record<Outcome, { title: string; lead: string }> = {
  aprobado: { title: "¡Pago recibido!", lead: "Gracias por tu compra. Ya quedó registrado tu pedido." },
  pendiente: {
    title: "Tu pago está en proceso",
    lead: "Wompi todavía lo está confirmando (con PSE o Nequi puede tardar unos minutos). Te avisamos por WhatsApp apenas entre."
  },
  rechazado: { title: "El pago no se completó", lead: "No se hizo ningún cobro. Puedes intentarlo de nuevo o pagar de otra forma." },
  desconocido: { title: "No encontramos el pedido", lead: "Si ya pagaste, escríbenos con el comprobante de Wompi y lo revisamos." }
};

export default async function PaymentResultPage({ searchParams }: Props) {
  const params = await searchParams;
  const demo = process.env.ADMIN_DEMO === "1";
  const token = first(params.pedido);
  const { order, attempt } = demo
    ? { order: demoOrder(first(params.demo) === "1" ? "demo-pagado" : token), attempt: null }
    : token
      ? await resolve(token, first(params.id))
      : { order: null, attempt: null };
  const outcome = outcomeOf(order, attempt);
  const settings = await getSiteSettings();
  const help = buildWhatsAppUrl(
    settings.whatsapp_number,
    order
      ? `Hola MotoSmart, acabo de pagar el pedido ${order.code} (${order.description}).`
      : "Hola MotoSmart, hice un pago en la página y quiero confirmarlo."
  );
  const Icon = outcome === "aprobado" ? CheckCircle2 : outcome === "pendiente" ? Clock : XCircle;
  // El mismo pedido se puede volver a pagar desde su enlace (abre un intento nuevo en Wompi).
  const retryHref = order && outcome === "rechazado" && order.kind !== "manual" ? `/pagar/${order.token}` : null;

  return (
    <>
      <PageIntro title={COPY[outcome].title} lead={COPY[outcome].lead} />
      <div className={cn(containerClasses, "py-10 md:py-14")}>
        <div className="mx-auto max-w-lg">
          <p
            className={cn(
              "flex items-center gap-2 font-semibold",
              outcome === "aprobado" ? "text-success" : outcome === "pendiente" ? "text-warning" : "text-danger"
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
            {outcome === "aprobado" ? "Aprobado" : outcome === "pendiente" ? "En proceso" : outcome === "rechazado" ? "No aprobado" : "Sin datos"}
          </p>

          {order ? (
            <dl className="mt-5 divide-y divide-line rounded-lg border border-line">
              <Row label="Pedido" value={order.code} />
              <Row label="Concepto" value={order.description} />
              <Row label="Total" value={formatCOP(order.amount_cop)} strong />
              {order.payment_method && outcome === "aprobado" ? <Row label="Medio de pago" value={methodLabel(order.payment_method)} /> : null}
            </dl>
          ) : null}

          {outcome === "aprobado" ? <p className="mt-6 text-ink-2">{settings.payment_note}</p> : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {retryHref ? (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={retryHref}>Intentar de nuevo</Link>
              </Button>
            ) : null}
            <Button asChild size="lg" variant={retryHref ? "secondary" : "default"} className="w-full sm:w-auto">
              <WhatsAppLink href={help} source="pago-resultado" reference={order?.code}>
                <WhatsAppIcon />
                {outcome === "aprobado" ? "Avisar por WhatsApp" : "Escribir por WhatsApp"}
              </WhatsAppLink>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className={cn("text-right", strong ? "tabular text-xl font-semibold text-ink" : "text-ink")}>{value}</dd>
    </div>
  );
}
