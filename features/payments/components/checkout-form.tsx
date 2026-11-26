"use client";

import { useActionState, useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackEvent } from "@/lib/analytics";
import { formatCOP } from "@/lib/utils";
import { startChargePayment, startStoreCheckout, type CheckoutState } from "@/features/payments/actions";

/** Al volver con la URL de Wompi, se va para allá (en la misma pestaña: el regreso cae en el resultado). */
function useRedirect(state: CheckoutState) {
  useEffect(() => {
    if (state.url) window.location.assign(state.url);
  }, [state.url]);
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-medium text-danger">
      {message}
    </p>
  );
}

function Field({
  name,
  label,
  error,
  optional,
  children
}: {
  name: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = `compra-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-ink-3"> (opcional)</span> : null}
      </Label>
      {children({ id, ...(error ? { "aria-invalid": true as const, "aria-describedby": errorId } : {}) })}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function PaySecurely() {
  return (
    <p className="flex items-start gap-2 text-sm text-ink-2">
      <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        Pagas en Wompi, la pasarela de Bancolombia: tarjeta de crédito o débito, PSE, Nequi o botón Bancolombia. MotoSmart
        nunca ve los datos de tu tarjeta.
      </span>
    </p>
  );
}

/** Datos del comprador de un diseño de la tienda. El precio lo pone el servidor. */
export function CheckoutForm({ designId, designSlug, amount }: { designId: string; designSlug: string; amount: number }) {
  const [state, action, pending] = useActionState(startStoreCheckout, {});
  const summaryRef = useRef<HTMLParagraphElement>(null);
  useRedirect(state);
  const fields = state.fields ?? {};

  // Con errores, el foco va al aviso para que el lector de pantalla lo lea.
  useEffect(() => {
    if (state.error) summaryRef.current?.focus();
  }, [state]);

  return (
    <form
      action={action}
      className="space-y-5"
      noValidate
      onSubmit={() => void trackEvent("checkout_start", { source: "diseno", reference: designSlug })}
    >
      <input type="hidden" name="design_id" value={designId} />
      <Field name="name" label="Nombre completo" error={fields.name}>
        {(props) => <Input {...props} name="name" autoComplete="name" required maxLength={120} />}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="phone" label="Celular (WhatsApp)" error={fields.phone}>
          {(props) => (
            <Input {...props} name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={20} placeholder="300 123 4567" />
          )}
        </Field>
        <Field name="email" label="Correo" error={fields.email}>
          {(props) => <Input {...props} name="email" type="email" autoComplete="email" required maxLength={160} />}
        </Field>
      </div>
      <Field name="city" label="Ciudad" error={fields.city}>
        {(props) => <Input {...props} name="city" autoComplete="address-level2" required maxLength={120} placeholder="Ej.: Medellín" />}
      </Field>
      <Field name="moto" label="Tu moto (marca, modelo y año)" error={fields.moto}>
        {(props) => <Input {...props} name="moto" required maxLength={160} placeholder="Ej.: Yamaha DT 125 de 2004" />}
      </Field>
      <Field name="notes" label="Algo más que debamos saber" error={fields.notes} optional>
        {(props) => (
          <Textarea {...props} name="notes" maxLength={600} placeholder="Color de costura, si la espuma está dañada, si quieres envío..." />
        )}
      </Field>

      {state.error ? (
        <p ref={summaryRef} tabIndex={-1} role="alert" className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" isLoading={pending || Boolean(state.url)}>
        Ir a pagar {formatCOP(amount)}
      </Button>
      <PaySecurely />
    </form>
  );
}

/** Botón de un cobro armado en el panel: el monto y la descripción ya vienen del pedido. */
export function ChargeForm({ token, amount }: { token: string; amount: number }) {
  const [state, action, pending] = useActionState(startChargePayment, {});
  useRedirect(state);
  return (
    <form action={action} className="space-y-4" onSubmit={() => void trackEvent("checkout_start", { source: "cobro" })}>
      <input type="hidden" name="token" value={token} />
      {state.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" isLoading={pending || Boolean(state.url)}>
        Pagar {formatCOP(amount)}
      </Button>
      <PaySecurely />
    </form>
  );
}
