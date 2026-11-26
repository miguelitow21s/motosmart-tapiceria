import { randomBytes, randomInt } from "node:crypto";
import { siteConfig } from "@/config/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkoutUrl, type WompiConfig, type WompiTransaction } from "@/lib/wompi";
import type { Order, PaymentAttempt } from "@/features/payments/types";

/*
  Pedidos y pagos del lado del servidor. Solo la service_role toca estas
  tablas (migración 016): ni la llave pública ni una sesión del panel las
  leen directo.
*/

type Admin = ReturnType<typeof createAdminSupabaseClient>;

export const ORDER_COLUMNS =
  "id,code,token,kind,status,design_id,design_name,brand_name,description,customer_name,customer_phone,customer_email,customer_city,notes,amount_cop,cost_cop,payment_method,paid_at,created_at,updated_at";

export const PAYMENT_COLUMNS =
  "id,reference,status,amount_in_cents,wompi_transaction_id,payment_method_type,environment,created_at,updated_at";

// Sin 0/O ni 1/I/L: el código se dicta por teléfono o se copia de un pantallazo.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function orderCode() {
  let code = "MS-";
  for (let i = 0; i < 6; i += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Enlace privado del pedido: 192 bits al azar, imposible de adivinar. */
function orderToken() {
  return randomBytes(24).toString("base64url");
}

export type NewOrder = Omit<
  Order,
  "id" | "code" | "token" | "created_at" | "updated_at" | "status" | "paid_at" | "payment_method"
> & {
  status?: Order["status"];
  paid_at?: string | null;
  payment_method?: string | null;
  created_by?: string | null;
};

/** Crea el pedido. El código es corto: si choca con otro (muy raro), se intenta con uno nuevo. */
export async function insertOrder(supabase: Admin, order: NewOrder): Promise<Order> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await supabase
      .from("orders")
      .insert({ ...order, code: orderCode(), token: orderToken() })
      .select(ORDER_COLUMNS)
      .single();
    if (!error) return data as Order;
    // 23505: valor repetido en una columna única (el código).
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("No se pudo generar un código de pedido único");
}

export function resultUrl(token: string) {
  return `${siteConfig.url}/pago/resultado?pedido=${encodeURIComponent(token)}`;
}

/**
 * Un intento de pago nuevo para el pedido y el enlace de Wompi. Cada intento
 * lleva su propia referencia: si el cliente cierra Wompi y vuelve a intentar,
 * el primero queda como "en curso" y nunca se confunde con el segundo.
 */
export async function startPayment(supabase: Admin, config: WompiConfig, order: Order) {
  const reference = `${order.code}-${Date.now().toString(36).toUpperCase()}`;
  const amountInCents = order.amount_cop * 100;
  const { error } = await supabase.from("payments").insert({
    order_id: order.id,
    reference,
    amount_in_cents: amountInCents,
    environment: config.environment
  });
  if (error) throw new Error(error.message);
  return checkoutUrl(config, {
    reference,
    amountInCents,
    redirectUrl: resultUrl(order.token),
    customer: { email: order.customer_email, fullName: order.customer_name, phone: order.customer_phone }
  });
}

export async function findOrderByToken(supabase: Admin, token: string): Promise<Order | null> {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const { data, error } = await supabase.from("orders").select(ORDER_COLUMNS).eq("token", token).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Order | null) ?? null;
}

export async function latestAttempt(supabase: Admin, orderId: string): Promise<PaymentAttempt | null> {
  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PaymentAttempt | null) ?? null;
}

const FINAL = new Set(["APPROVED", "DECLINED", "VOIDED", "ERROR"]);

export type ApplyResult = "unknown-reference" | "ignored" | "updated" | "unchanged";

/**
 * Aplica lo que dice Wompi de una transacción (llegue por el evento o por la
 * consulta al volver de pagar). Seguro de repetir: Wompi reenvía eventos y
 * los dos caminos pueden llegar a la vez.
 *
 * - Un intento que ya terminó no vuelve atrás (aprobado no pasa a "en curso").
 *   La única excepción es una anulación de un pago aprobado.
 * - Si el monto o la moneda no son los del intento, el pago no cuenta: queda
 *   en error y el pedido sigue esperando pago.
 * - Lanza si la base falla, para que el evento responda 500 y Wompi reintente.
 */
export async function applyTransaction(
  supabase: Admin,
  tx: WompiTransaction,
  environment: "test" | "prod",
  raw: unknown
): Promise<ApplyResult> {
  const { data: payment, error } = await supabase
    .from("payments")
    .select("id,order_id,status,amount_in_cents,wompi_transaction_id")
    .eq("reference", tx.reference)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) return "unknown-reference";

  let status: WompiTransaction["status"] = tx.status;
  if (Number(payment.amount_in_cents) !== tx.amount_in_cents || tx.currency !== "COP") {
    console.error("wompi: monto o moneda no cuadran", tx.reference, tx.amount_in_cents, tx.currency);
    status = "ERROR";
  }

  const voidingApproved = payment.status === "APPROVED" && status === "VOIDED";
  if (FINAL.has(payment.status) && !voidingApproved) {
    return payment.status === status ? "unchanged" : "ignored";
  }
  if (payment.status === status && payment.wompi_transaction_id === tx.id) return "unchanged";

  const now = new Date().toISOString();
  // Condicionado al estado leído: si otro camino ya lo cambió, este no pisa.
  const { data: changed, error: updateError } = await supabase
    .from("payments")
    .update({
      status,
      wompi_transaction_id: tx.id,
      payment_method_type: tx.payment_method_type,
      environment,
      raw: raw ?? null,
      updated_at: now
    })
    .eq("id", payment.id)
    .eq("status", payment.status)
    .select("id");
  if (updateError) throw new Error(updateError.message);
  if (!changed?.length) return "unchanged";

  if (status === "APPROVED") {
    // Un cobro cancelado en el panel que el cliente igual pagó: entró la
    // plata, así que cuenta como pagado (Natalia decide si lo devuelve).
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "pagado", paid_at: now, payment_method: tx.payment_method_type, updated_at: now })
      .eq("id", payment.order_id)
      .in("status", ["esperando_pago", "cancelado"]);
    if (orderError) throw new Error(orderError.message);
  } else if (voidingApproved) {
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "esperando_pago", paid_at: null, updated_at: now })
      .eq("id", payment.order_id)
      .eq("status", "pagado");
    if (orderError) throw new Error(orderError.message);
  }
  return "updated";
}

/**
 * Freno a pedidos en masa desde la tienda: pocos por celular y un tope
 * general por cuarto de hora. No reemplaza a Wompi (que cobra), solo evita
 * que alguien llene la tabla de pedidos falsos.
 */
export async function storeOrderAllowed(supabase: Admin, phone: string) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const [samePhone, all] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", phone)
      .gte("created_at", since),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("kind", "tienda")
      .gte("created_at", since)
  ]);
  if (samePhone.error || all.error) throw new Error((samePhone.error ?? all.error)!.message);
  return (samePhone.count ?? 0) < 5 && (all.count ?? 0) < 120;
}
