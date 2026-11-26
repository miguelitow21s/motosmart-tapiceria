"use client";

import { useEffect, useId, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { describedBy, DisclosureSummary, Field, PriceInput, Select } from "@/features/admin/components/fields";
import { Badge } from "@/features/admin/components/primitives";
import { confirmAction, runBusy } from "@/features/admin/lib/feedback";
import { formatThousands } from "@/features/admin/lib/format";
import {
  copyText,
  customerWhatsApp,
  loadAttempts,
  payLink,
  payLinkWhatsApp,
  updateOrder,
  type OrderChanges
} from "@/features/admin/lib/order-actions";
import { useAdminStore } from "@/features/admin/store/admin-data";
import {
  ATTEMPT_LABEL,
  isPaidStatus,
  KIND_LABEL,
  MANUAL_METHODS,
  methodLabel,
  ORDER_STATUSES,
  STATUS_LABEL,
  type ManualMethod,
  type Order,
  type OrderStatus,
  type PaymentAttempt
} from "@/features/payments/types";
import { MAX_PRICE } from "@/lib/price-limits";
import { formatCOP } from "@/lib/utils";

export const STATUS_TONE: Record<OrderStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  esperando_pago: "warning",
  pagado: "success",
  en_proceso: "info",
  entregado: "neutral",
  cancelado: "danger"
};

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

function when(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateTime.format(date);
}

/** "573001234567" → "300 123 4567". */
export function displayPhone(phone: string | null) {
  if (!phone) return "";
  const local = phone.replace(/^57/, "");
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : phone;
}

type Draft = {
  status: OrderStatus;
  payment_method: ManualMethod | "";
  cost_cop: number | null;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  notes: string;
};

function toDraft(order: Order): Draft {
  return {
    status: order.status,
    payment_method: "",
    cost_cop: order.cost_cop,
    customer_name: order.customer_name ?? "",
    customer_phone: order.customer_phone ? order.customer_phone.replace(/^57/, "") : "",
    customer_city: order.customer_city ?? "",
    notes: order.notes ?? ""
  };
}

export function OrderDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const id = useId();
  const siteUrl = useAdminStore((state) => state.siteUrl);
  const [initial] = useState(() => toDraft(order));
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<"payment_method" | "cost_cop" | "customer_phone", string>>>({});
  const [attempts, setAttempts] = useState<PaymentAttempt[] | string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const online = order.kind !== "manual";
  // Pasa a pagado a mano un pedido sin medio de pago: hay que decir cómo entró la plata.
  const needsMethod = isPaidStatus(draft.status) && !isPaidStatus(order.status) && !order.payment_method;
  const canCollect = online && order.status === "esperando_pago";
  const whatsapp = customerWhatsApp(order);

  useEffect(() => {
    if (!online) return;
    let alive = true;
    void loadAttempts(order).then((result) => {
      if (alive) setAttempts(result);
    });
    return () => {
      alive = false;
    };
  }, [order, online]);

  function update(changes: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors({});
  }

  async function requestClose() {
    if (dirty) {
      const leave = await confirmAction({
        title: "¿Salir sin guardar?",
        description: "Se pierden los cambios de este pedido.",
        confirmLabel: "Salir sin guardar",
        tone: "danger"
      });
      if (!leave) return;
    }
    onClose();
  }

  async function submit() {
    const found: typeof errors = {};
    if (needsMethod && !draft.payment_method) found.payment_method = "Elige cómo pagó el cliente.";
    if (draft.cost_cop != null && draft.cost_cop > MAX_PRICE) found.cost_cop = "El costo es demasiado alto: revisa que no sobre un cero.";
    const phone = draft.customer_phone.replace(/\D/g, "");
    if (phone && !/^3\d{9}$/.test(phone)) found.customer_phone = "El celular debe tener 10 dígitos y empezar por 3.";
    setErrors(found);
    const first = (["payment_method", "cost_cop", "customer_phone"] as const).find((key) => found[key]);
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }

    // Deshacer un pago de Wompi en el panel no devuelve la plata: se avisa antes.
    const undoingPaid = isPaidStatus(order.status) && !isPaidStatus(draft.status);
    if (undoingPaid && order.kind !== "manual") {
      const ok = await confirmAction({
        title: `¿Marcar como «${STATUS_LABEL[draft.status]}»?`,
        description:
          "Este pedido se pagó en línea. Cambiar el estado aquí no le devuelve la plata al cliente: la devolución se hace en el panel de Wompi.",
        confirmLabel: "Cambiar estado",
        tone: "danger"
      });
      if (!ok) return;
    }

    const changes: OrderChanges = {};
    if (draft.status !== initial.status) changes.status = draft.status;
    if (needsMethod && draft.payment_method) changes.payment_method = draft.payment_method;
    if (draft.cost_cop !== initial.cost_cop) changes.cost_cop = draft.cost_cop;
    if (draft.customer_name !== initial.customer_name) changes.customer_name = draft.customer_name;
    if (draft.customer_phone !== initial.customer_phone) changes.customer_phone = phone;
    if (draft.customer_city !== initial.customer_city) changes.customer_city = draft.customer_city;
    if (draft.notes !== initial.notes) changes.notes = draft.notes;

    await runBusy("Guardando pedido…", async () => {
      if (await updateOrder(order, changes)) onClose();
    });
  }

  const profit = draft.cost_cop != null ? order.amount_cop - draft.cost_cop : null;

  return (
    <Modal
      open
      onClose={() => void requestClose()}
      title={`Pedido ${order.code}`}
      description={`${KIND_LABEL[order.kind]} · ${when(order.created_at)}`}
      dismissible={false}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => void requestClose()}>
            {dirty ? "Cancelar" : "Cerrar"}
          </Button>
          <Button variant="dark" disabled={!dirty} onClick={() => void submit()}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <dl className="divide-y divide-line rounded-lg border border-line">
          <Row label="Concepto">{order.description}</Row>
          <Row label="Total">
            <span className="tabular text-lg font-semibold">{formatCOP(order.amount_cop)}</span>
          </Row>
          <Row label="Estado">
            <span className="flex flex-wrap justify-end gap-1.5">
              <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
              {order.is_test ? <Badge tone="neutral">Prueba: no cuenta como venta</Badge> : null}
            </span>
          </Row>
          {order.payment_method || order.paid_at ? (
            <Row label="Pago">
              {[methodLabel(order.payment_method), when(order.paid_at)].filter(Boolean).join(" · ")}
            </Row>
          ) : null}
          {order.design_name ? <Row label="Diseño">{[order.design_name, order.brand_name].filter(Boolean).join(" · ")}</Row> : null}
          {order.customer_email ? <Row label="Correo">{order.customer_email}</Row> : null}
        </dl>

        {canCollect ? (
          <div className="rounded-lg border border-line bg-surface/60 p-4">
            <p className="font-semibold">Enlace de pago</p>
            <p className="mt-1 text-sm break-all text-ink-2">{payLink(order, siteUrl)}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" size="sm" onClick={() => void copyText(payLink(order, siteUrl), "Enlace copiado")}>
                <Copy aria-hidden="true" />
                Copiar enlace
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href={payLinkWhatsApp(order, siteUrl)} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon />
                  Mandar por WhatsApp
                </a>
              </Button>
            </div>
          </div>
        ) : whatsapp ? (
          <Button asChild variant="secondary" className="w-full sm:w-auto">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon />
              Escribirle al cliente
            </a>
          </Button>
        ) : null}

        <form
          noValidate
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${id}-status`} label="Estado" hint="«En el taller» y «Entregado» siguen contando como venta.">
              <Select
                id={`${id}-status`}
                value={draft.status}
                aria-describedby={`${id}-status-hint`}
                onChange={(event) => update({ status: event.target.value as OrderStatus })}
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </Field>
            {needsMethod ? (
              <Field id={`${id}-payment_method`} label="¿Cómo pagó?" error={errors.payment_method}>
                <Select
                  id={`${id}-payment_method`}
                  value={draft.payment_method}
                  aria-invalid={Boolean(errors.payment_method)}
                  aria-describedby={describedBy(`${id}-payment_method`, undefined, errors.payment_method)}
                  onChange={(event) => update({ payment_method: event.target.value as ManualMethod })}
                >
                  <option value="">Elegir…</option>
                  {MANUAL_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {methodLabel(method)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>

          <Field
            id={`${id}-cost_cop`}
            label="Costo"
            optional
            error={errors.cost_cop}
            hint={
              profit != null
                ? `Ganancia: ${formatCOP(profit)}${order.amount_cop ? ` (${Math.round((profit / order.amount_cop) * 100)} %)` : ""}`
                : "Lo que costó hacerla: materiales, mano de obra, envío. Con esto se calcula la ganancia."
            }
          >
            <PriceInput
              id={`${id}-cost_cop`}
              value={draft.cost_cop}
              placeholder={formatThousands(Math.round(order.amount_cop * 0.5))}
              aria-invalid={Boolean(errors.cost_cop)}
              aria-describedby={describedBy(`${id}-cost_cop`, "hint", errors.cost_cop)}
              onValueChange={(value) => update({ cost_cop: value })}
            />
          </Field>

          <fieldset className="space-y-4">
            <legend className="mb-3 font-semibold">Cliente</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${id}-customer_name`} label="Nombre" optional>
                <Input
                  id={`${id}-customer_name`}
                  value={draft.customer_name}
                  maxLength={120}
                  autoComplete="off"
                  onChange={(event) => update({ customer_name: event.target.value })}
                />
              </Field>
              <Field id={`${id}-customer_phone`} label="Celular" optional error={errors.customer_phone}>
                <Input
                  id={`${id}-customer_phone`}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.customer_phone}
                  placeholder="300 123 4567"
                  aria-invalid={Boolean(errors.customer_phone)}
                  aria-describedby={describedBy(`${id}-customer_phone`, undefined, errors.customer_phone)}
                  onChange={(event) => update({ customer_phone: event.target.value.replace(/[^\d ]/g, "").slice(0, 13) })}
                />
              </Field>
            </div>
            <Field id={`${id}-customer_city`} label="Ciudad" optional>
              <Input
                id={`${id}-customer_city`}
                value={draft.customer_city}
                maxLength={120}
                autoComplete="off"
                onChange={(event) => update({ customer_city: event.target.value })}
              />
            </Field>
            <Field id={`${id}-notes`} label="Notas" optional hint="Medida, color, fecha de entrega, si va con envío…">
              <Textarea
                id={`${id}-notes`}
                value={draft.notes}
                maxLength={1000}
                rows={3}
                className="min-h-24"
                aria-describedby={`${id}-notes-hint`}
                onChange={(event) => update({ notes: event.target.value })}
              />
            </Field>
          </fieldset>
        </form>

        {online ? (
          <details className="group">
            <DisclosureSummary>
              Intentos de pago en Wompi{Array.isArray(attempts) ? ` (${attempts.length})` : ""}
            </DisclosureSummary>
            {attempts === null ? (
              <p className="text-sm text-ink-2" role="status">
                Cargando…
              </p>
            ) : typeof attempts === "string" ? (
              <p className="text-sm text-danger">{attempts}</p>
            ) : attempts.length === 0 ? (
              <p className="text-sm text-ink-2">El cliente todavía no ha abierto el pago.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line text-sm">
                {attempts.map((attempt) => (
                  <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block font-medium">{ATTEMPT_LABEL[attempt.status]}</span>
                      <span className="block text-ink-3">
                        {[methodLabel(attempt.payment_method_type), when(attempt.created_at), attempt.environment === "test" ? "pruebas" : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {attempt.wompi_transaction_id ? (
                      <span className="tabular text-ink-3">ID {attempt.wompi_transaction_id}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </details>
        ) : null}
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-sm text-ink-2">{label}</dt>
      <dd className="min-w-0 text-right wrap-anywhere">{children}</dd>
    </div>
  );
}
