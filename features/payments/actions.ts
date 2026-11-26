"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { currentPrice } from "@/components/ui/price";
import { sanitizeText } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { wompiConfig } from "@/lib/wompi";
import { payAccess } from "@/features/payments/server/access";
import {
  findOrderByToken,
  insertOrder,
  ipFingerprint,
  paymentAttemptAllowed,
  startPayment,
  STORE_ORDER_TTL_MS,
  storeOrderAllowed
} from "@/features/payments/server/orders";
import { MIN_CHARGE_COP } from "@/features/payments/types";

/*
  Lo que la tienda le pide al servidor para pagar. Son Server Actions: Next
  verifica que la petición venga de la misma página (Origin), así que no hace
  falta el token CSRF del panel. El precio nunca viene del navegador: se lee
  del diseño en la base al momento de pagar.
*/

export type CheckoutState = { error?: string; fields?: Record<string, string>; url?: string };

const UNAVAILABLE = "Los pagos en línea no están disponibles en este momento. Escríbenos por WhatsApp y te ayudamos.";
const FAILED = "No pudimos abrir el pago. Intenta de nuevo en un momento o escríbenos por WhatsApp.";
// Solo en local con ADMIN_DEMO=1: se recorre el flujo sin crear pedidos ni ir a Wompi.
const DEMO_URL = "/pago/resultado?demo=1";

const text = (max: number) =>
  z
    .string()
    .transform((value) => sanitizeText(value))
    .pipe(z.string().max(max, `Máximo ${max} caracteres.`));

const buyerSchema = z.object({
  design_id: z.string().uuid(),
  name: text(120).pipe(z.string().min(3, "Escribe tu nombre completo.")),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().regex(/^(57)?3\d{9}$/, "Escribe tu celular de 10 dígitos (empieza por 3).")),
  email: text(160).pipe(z.string().email("Revisa el correo: Wompi te manda ahí el comprobante.")),
  city: text(120).pipe(z.string().min(2, "Escribe tu ciudad.")),
  moto: text(160).pipe(z.string().min(3, "Cuéntanos qué moto tienes (marca, modelo y año).")),
  notes: text(600).optional()
});

function fieldErrors(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] ??= issue.message;
  }
  return fields;
}

/** "Comprar" en la ficha de un diseño: crea el pedido al precio de hoy y manda a Wompi. */
export async function startStoreCheckout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const parsed = buyerSchema.safeParse({
    design_id: form.get("design_id"),
    name: form.get("name") ?? "",
    phone: form.get("phone") ?? "",
    email: form.get("email") ?? "",
    city: form.get("city") ?? "",
    moto: form.get("moto") ?? "",
    notes: form.get("notes") ?? ""
  });
  if (!parsed.success) return { error: "Revisa los datos marcados.", fields: fieldErrors(parsed.error) };

  if (!(await payAccess()).ok) return { error: UNAVAILABLE };
  if (process.env.ADMIN_DEMO === "1") return { url: DEMO_URL };
  const config = wompiConfig();
  if (!config) return { error: UNAVAILABLE };

  const input = parsed.data;
  const phone = input.phone.length === 10 ? `57${input.phone}` : input.phone;
  try {
    const supabase = createAdminSupabaseClient();
    const { data: design, error } = await supabase
      .from("designs")
      .select(
        "id,name,is_active,base_price,discount_price,promotion_label,promotion_active,promotion_starts_at,promotion_ends_at,brands!inner(name,is_active)"
      )
      .eq("id", input.design_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const brand = (Array.isArray(design?.brands) ? design.brands[0] : design?.brands) as
      | { name: string; is_active: boolean }
      | undefined;
    if (!design || !design.is_active || !brand?.is_active) {
      return { error: "Este diseño ya no está disponible. Escríbenos por WhatsApp y te ayudamos." };
    }
    const { value, showable } = currentPrice(design);
    if (!showable || value < MIN_CHARGE_COP) {
      return { error: "Este diseño se cotiza por WhatsApp: escríbenos y te damos el precio." };
    }
    // x-real-ip la pone Vercel (el cliente no la controla).
    const ipHash = ipFingerprint((await headers()).get("x-real-ip"), config.integritySecret);
    if (!(await storeOrderAllowed(supabase, phone, ipHash))) {
      return { error: "Ya abriste varios pagos hace poco. Espera unos minutos o escríbenos por WhatsApp." };
    }

    const order = await insertOrder(supabase, {
      kind: "tienda",
      design_id: design.id,
      design_name: design.name,
      brand_name: brand.name,
      description: `Silla ${design.name} (${brand.name})`,
      customer_name: input.name,
      customer_phone: phone,
      customer_email: input.email.toLowerCase(),
      customer_city: input.city,
      notes: [`Moto: ${input.moto}`, input.notes].filter(Boolean).join("\n"),
      amount_cop: value,
      cost_cop: null,
      client_ip_hash: ipHash
    });
    return { url: await startPayment(supabase, config, order) };
  } catch (error) {
    console.error("startStoreCheckout", error instanceof Error ? error.message : error);
    return { error: FAILED };
  }
}

/** "Pagar" en el enlace de un cobro que armó Natalia (/pagar/<token>). */
export async function startChargePayment(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const token = String(form.get("token") ?? "");
  if (!(await payAccess()).ok) return { error: UNAVAILABLE };
  if (process.env.ADMIN_DEMO === "1") return { url: DEMO_URL };
  const config = wompiConfig();
  if (!config) return { error: UNAVAILABLE };
  try {
    const supabase = createAdminSupabaseClient();
    const order = await findOrderByToken(supabase, token);
    if (!order) return { error: "No encontramos este cobro. Pídenos el enlace de nuevo por WhatsApp." };
    if (order.status !== "esperando_pago") return { error: "Este cobro ya está pagado o fue cancelado." };
    if (order.kind === "tienda" && Date.now() - Date.parse(order.created_at) > STORE_ORDER_TTL_MS) {
      return { error: "Este pedido venció (el precio pudo cambiar). Vuelve a la tienda para comprar de nuevo, o escríbenos por WhatsApp." };
    }
    if (!(await paymentAttemptAllowed(supabase, order.id))) {
      return { error: "Hiciste muchos intentos de pago seguidos. Espera un rato o escríbenos por WhatsApp y te ayudamos." };
    }
    return { url: await startPayment(supabase, config, order) };
  } catch (error) {
    console.error("startChargePayment", error instanceof Error ? error.message : error);
    return { error: FAILED };
  }
}
