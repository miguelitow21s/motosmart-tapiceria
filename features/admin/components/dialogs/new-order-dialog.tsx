"use client";

import { useId, useMemo, useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { describedBy, Field, PriceInput, Select } from "@/features/admin/components/fields";
import { confirmAction, runBusy } from "@/features/admin/lib/feedback";
import { copyText, createOrder, payLink, payLinkWhatsApp } from "@/features/admin/lib/order-actions";
import { goToTab } from "@/features/admin/lib/tabs";
import { useAdminData, useAdminStore } from "@/features/admin/store/admin-data";
import { bogotaDay } from "@/features/payments/sales";
import { MANUAL_METHODS, methodLabel, MIN_CHARGE_COP, type ManualMethod, type Order } from "@/features/payments/types";
import { MAX_PRICE } from "@/lib/price-limits";
import { formatCOP } from "@/lib/utils";

/*
  Dos formas de sumar una venta:
  - cobro: Natalia cotizó por WhatsApp, arma el cobro y le manda al cliente
    un enlace para pagar con Wompi.
  - manual: la plata ya entró por fuera (efectivo, transferencia, datáfono)
    y solo se anota para que salga en las cuentas.
*/

type Kind = "cobro" | "manual";

type Draft = {
  description: string;
  amount_cop: number | null;
  cost_cop: number | null;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  notes: string;
  payment_method: ManualMethod;
  paid_on: string;
  design_id: string;
};

type Errors = Partial<Record<"description" | "amount_cop" | "cost_cop" | "customer_phone" | "paid_on", string>>;

const EMPTY = (): Draft => ({
  description: "",
  amount_cop: null,
  cost_cop: null,
  customer_name: "",
  customer_phone: "",
  customer_city: "",
  notes: "",
  payment_method: "EFECTIVO",
  paid_on: bogotaDay(),
  design_id: ""
});

export function NewOrderDialog({
  kind,
  ready,
  onClose,
  onSwitchToSale
}: {
  kind: Kind;
  /** Wompi conectado y «Pagos en línea» encendido. */
  ready: boolean;
  onClose: () => void;
  onSwitchToSale: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [created, setCreated] = useState<Order | null>(null);
  const siteUrl = useAdminStore((state) => state.siteUrl);
  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY());
  const isCharge = kind === "cobro";

  // Los diseños sirven para la venta a mano («Qué se vendió»).
  useAdminData(["designs", "brands"]);
  const designs = useAdminStore((state) => state.designs);
  const brands = useAdminStore((state) => state.brands);
  const designOptions = useMemo(() => {
    const brandName = new Map(brands.map((brand) => [brand.id, brand.name]));
    return designs
      .map((design) => ({ id: design.id, label: `${design.name} · ${brandName.get(design.brand_id) ?? ""}`, price: design.discount_price ?? design.base_price }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [designs, brands]);

  function update(changes: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors({});
  }

  async function requestClose() {
    if (dirty && !created) {
      const leave = await confirmAction({
        title: "¿Salir sin guardar?",
        description: isCharge ? "Se pierde el cobro que estabas armando." : "Se pierde la venta que estabas anotando.",
        confirmLabel: "Salir sin guardar",
        tone: "danger"
      });
      if (!leave) return;
    }
    onClose();
  }

  async function submit() {
    const found: Errors = {};
    const phone = draft.customer_phone.replace(/\D/g, "");
    if (draft.description.trim().length < 2) found.description = isCharge ? "Escribe qué se cobra." : "Escribe qué se vendió.";
    if (draft.amount_cop == null) found.amount_cop = "Escribe el monto.";
    else if (draft.amount_cop < MIN_CHARGE_COP) found.amount_cop = `El monto mínimo es ${formatCOP(MIN_CHARGE_COP)}.`;
    else if (draft.amount_cop > MAX_PRICE) found.amount_cop = "El monto es demasiado alto: revisa que no sobre un cero.";
    if (draft.cost_cop != null && draft.cost_cop > MAX_PRICE) found.cost_cop = "El costo es demasiado alto: revisa que no sobre un cero.";
    if (phone && !/^3\d{9}$/.test(phone)) found.customer_phone = "El celular debe tener 10 dígitos y empezar por 3.";
    if (!isCharge && (!draft.paid_on || draft.paid_on > bogotaDay())) found.paid_on = "Elige una fecha de hoy o de antes.";
    setErrors(found);
    const first = (["description", "amount_cop", "paid_on", "cost_cop", "customer_phone"] as const).find((key) => found[key]);
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }

    const customer = {
      customer_name: draft.customer_name,
      customer_phone: phone,
      customer_city: draft.customer_city,
      notes: draft.notes
    };
    await runBusy(isCharge ? "Creando cobro…" : "Registrando venta…", async () => {
      const order = await createOrder(
        isCharge
          ? { kind: "cobro", description: draft.description, amount_cop: draft.amount_cop!, cost_cop: draft.cost_cop, ...customer }
          : {
              kind: "manual",
              description: draft.description,
              amount_cop: draft.amount_cop!,
              cost_cop: draft.cost_cop,
              payment_method: draft.payment_method,
              paid_on: draft.paid_on,
              design_id: draft.design_id || null,
              ...customer
            }
      );
      if (!order) return;
      if (isCharge) setCreated(order);
      else onClose();
    });
  }

  if (isCharge && !ready) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Los cobros por enlace están apagados"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button variant="dark" onClick={onSwitchToSale}>
              Registrar venta a mano
            </Button>
          </>
        }
      >
        <p className="text-ink-2">
          Para mandar enlaces de pago hay que conectar Wompi y encender «Pagos en línea» en Módulos. Los pasos están arriba, en esta misma
          sección.
        </p>
        <Button
          variant="ghost"
          className="mt-3 -ml-3"
          onClick={() => {
            onClose();
            goToTab("features");
          }}
        >
          Ir a Módulos
        </Button>
      </Modal>
    );
  }

  if (created) {
    const link = payLink(created, siteUrl);
    return (
      <Modal
        open
        onClose={onClose}
        title={`Cobro ${created.code} listo`}
        footer={
          <Button variant="dark" onClick={onClose}>
            Listo
          </Button>
        }
      >
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
          {formatCOP(created.amount_cop)} · {created.description}
        </p>
        <p className="mt-3 text-ink-2">
          Mándale este enlace al cliente. Ahí ve el concepto y el total, y paga con tarjeta, PSE, Nequi o Bancolombia. Cuando pague, el pedido pasa
          solo a «Pagado».
        </p>
        <p className="mt-4 rounded-lg border border-line bg-surface/60 px-4 py-3 text-sm break-all">{link}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="dark">
            <a href={payLinkWhatsApp(created, siteUrl)} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon />
              {created.customer_phone ? "Mandar por WhatsApp" : "Elegir chat en WhatsApp"}
            </a>
          </Button>
          <Button variant="secondary" onClick={() => void copyText(link, "Enlace copiado")}>
            <Copy aria-hidden="true" />
            Copiar enlace
          </Button>
        </div>
      </Modal>
    );
  }

  const profit = draft.cost_cop != null && draft.amount_cop != null ? draft.amount_cop - draft.cost_cop : null;

  return (
    <Modal
      open
      onClose={() => void requestClose()}
      title={isCharge ? "Nuevo cobro por enlace" : "Registrar una venta"}
      description={
        isCharge
          ? "Para lo que cotizaste por WhatsApp: el cliente recibe un enlace y paga en línea."
          : "Para la plata que ya entró por fuera de la página: efectivo, transferencia o datáfono."
      }
      dismissible={false}
      footer={
        <>
          <Button variant="secondary" onClick={() => void requestClose()}>
            Cancelar
          </Button>
          <Button variant="dark" onClick={() => void submit()}>
            {isCharge ? "Crear enlace" : "Registrar venta"}
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />

        {!isCharge && designOptions.length ? (
          <Field id={`${id}-design_id`} label="Diseño del catálogo" optional hint="Así sale en «Qué se vendió».">
            <Select
              id={`${id}-design_id`}
              value={draft.design_id}
              aria-describedby={`${id}-design_id-hint`}
              onChange={(event) => {
                const option = designOptions.find((item) => item.id === event.target.value);
                update({
                  design_id: event.target.value,
                  ...(option && !draft.description ? { description: `Silla ${option.label.replace(" · ", " ")}` } : {}),
                  ...(option && draft.amount_cop == null && option.price ? { amount_cop: option.price } : {})
                });
              }}
            >
              <option value="">Trabajo a la medida (sin diseño)</option>
              {designOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field
          id={`${id}-description`}
          label={isCharge ? "Qué se cobra" : "Qué se vendió"}
          error={errors.description}
          hint={isCharge ? "El cliente lo ve en la página de pago." : undefined}
        >
          <Input
            id={`${id}-description`}
            value={draft.description}
            maxLength={300}
            autoComplete="off"
            placeholder="Ej.: Forro antideslizante Yamaha DT 125, costura roja"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={describedBy(`${id}-description`, isCharge ? "hint" : undefined, errors.description)}
            onChange={(event) => update({ description: event.target.value })}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-amount_cop`} label={isCharge ? "Total a cobrar" : "Total que pagó"} error={errors.amount_cop}>
            <PriceInput
              id={`${id}-amount_cop`}
              value={draft.amount_cop}
              aria-invalid={Boolean(errors.amount_cop)}
              aria-describedby={describedBy(`${id}-amount_cop`, undefined, errors.amount_cop)}
              onValueChange={(value) => update({ amount_cop: value })}
            />
          </Field>
          <Field
            id={`${id}-cost_cop`}
            label="Costo"
            optional
            error={errors.cost_cop}
            hint={profit != null ? `Ganancia: ${formatCOP(profit)}` : "Materiales y mano de obra: para ver la ganancia."}
          >
            <PriceInput
              id={`${id}-cost_cop`}
              value={draft.cost_cop}
              aria-invalid={Boolean(errors.cost_cop)}
              aria-describedby={describedBy(`${id}-cost_cop`, "hint", errors.cost_cop)}
              onValueChange={(value) => update({ cost_cop: value })}
            />
          </Field>
        </div>

        {!isCharge ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${id}-payment_method`} label="Cómo pagó">
              <Select
                id={`${id}-payment_method`}
                value={draft.payment_method}
                onChange={(event) => update({ payment_method: event.target.value as ManualMethod })}
              >
                {MANUAL_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {methodLabel(method)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id={`${id}-paid_on`} label="Fecha del pago" error={errors.paid_on}>
              <Input
                id={`${id}-paid_on`}
                type="date"
                value={draft.paid_on}
                max={bogotaDay()}
                aria-invalid={Boolean(errors.paid_on)}
                aria-describedby={describedBy(`${id}-paid_on`, undefined, errors.paid_on)}
                onChange={(event) => update({ paid_on: event.target.value })}
              />
            </Field>
          </div>
        ) : null}

        <fieldset className="space-y-4">
          <legend className="mb-3 font-semibold">
            Cliente <span className="font-normal text-ink-3">(opcional)</span>
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-customer_name`} label="Nombre">
              <Input
                id={`${id}-customer_name`}
                value={draft.customer_name}
                maxLength={120}
                autoComplete="off"
                onChange={(event) => update({ customer_name: event.target.value })}
              />
            </Field>
            <Field
              id={`${id}-customer_phone`}
              label="Celular"
              error={errors.customer_phone}
              hint={isCharge ? "Para mandarle el enlace directo por WhatsApp." : undefined}
            >
              <Input
                id={`${id}-customer_phone`}
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                placeholder="300 123 4567"
                value={draft.customer_phone}
                aria-invalid={Boolean(errors.customer_phone)}
                aria-describedby={describedBy(`${id}-customer_phone`, isCharge ? "hint" : undefined, errors.customer_phone)}
                onChange={(event) => update({ customer_phone: event.target.value.replace(/[^\d ]/g, "").slice(0, 13) })}
              />
            </Field>
          </div>
          <Field id={`${id}-customer_city`} label="Ciudad">
            <Input
              id={`${id}-customer_city`}
              value={draft.customer_city}
              maxLength={120}
              autoComplete="off"
              onChange={(event) => update({ customer_city: event.target.value })}
            />
          </Field>
          <Field id={`${id}-notes`} label="Notas" hint="Solo las ve el taller.">
            <Textarea
              id={`${id}-notes`}
              value={draft.notes}
              maxLength={1000}
              rows={2}
              className="min-h-20"
              aria-describedby={`${id}-notes-hint`}
              onChange={(event) => update({ notes: event.target.value })}
            />
          </Field>
        </fieldset>
      </form>
    </Modal>
  );
}
