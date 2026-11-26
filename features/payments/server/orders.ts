import { createHash, randomBytes, randomInt } from "node:crypto";
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
  "id,code,token,kind,status,design_id,design_name,brand_name,description,customer_name,customer_phone,customer_email,customer_city,notes,amount_cop,cost_cop,payment_method,paid_at,is_test,created_at,updated_at";

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
  "id" | "code" | "token" | "created_at" | "updated_at" | "status" | "paid_at" | "payment_method" | "is_test"
> & {
  status?: Order["status"];
  paid_at?: string | null;
  payment_method?: string | null;
  created_by?: string | null;
  client_ip_hash?: string | null;
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

export type ApplyResult = "unknown-reference" | "ignored" | "updated" | "unchanged";

const RESULTS = new Set<ApplyResult>(["unknown-reference", "ignored", "updated", "unchanged"]);

/**
 * Aplica lo que dice Wompi de una transacción (llegue por el evento o por la
 * consulta al volver de pagar). Todo pasa en una sola transacción de la base
 * (función apply_wompi_transaction, migración 016): intento y pedido cambian
 * juntos o no cambian, y dos llamadas a la vez se esperan. Seguro de repetir.
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
  const { data, error } = await supabase.rpc("apply_wompi_transaction", {
    p_reference: tx.reference,
    p_tx_id: tx.id,
    p_status: tx.status,
    p_amount_in_cents: tx.amount_in_cents,
    p_currency: tx.currency,
    p_method: tx.payment_method_type,
    p_environment: environment,
    p_raw: raw ?? null
  });
  if (error) throw new Error(error.message);
  const result = data as ApplyResult;
  if (!RESULTS.has(result)) throw new Error("Respuesta inesperada de apply_wompi_transaction");
  return result;
}

/** Huella de la IP del comprador (sha256 con sal): sirve para contar, no para identificar. */
export function ipFingerprint(ip: string | null, salt: string) {
  if (!ip) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Freno a pedidos en masa desde la tienda, por cuarto de hora: pocos por
 * celular y por IP, y un tope general alto solo como red de seguridad. No
 * reemplaza a Wompi (que cobra), solo evita que alguien llene la tabla de
 * pedidos falsos. El conteo no es atómico: frena abusos, no es exacto.
 */
export async function storeOrderAllowed(supabase: Admin, phone: string, ipHash: string | null) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const count = (column: "customer_phone" | "client_ip_hash" | "kind", value: string) =>
    supabase.from("orders").select("id", { count: "exact", head: true }).eq(column, value).gte("created_at", since);
  const [samePhone, sameIp, all] = await Promise.all([
    count("customer_phone", phone),
    ipHash ? count("client_ip_hash", ipHash) : Promise.resolve({ count: 0, error: null }),
    count("kind", "tienda")
  ]);
  const failed = samePhone.error ?? sameIp.error ?? all.error;
  if (failed) throw new Error(failed.message);
  return (samePhone.count ?? 0) < 5 && (sameIp.count ?? 0) < 8 && (all.count ?? 0) < 400;
}

/** Tope de intentos de pago por pedido: 10 por hora. */
export async function paymentAttemptAllowed(supabase: Admin, orderId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return (count ?? 0) < 10;
}

/** Un pedido de la tienda guarda el precio del día: vence a las 48 horas. */
export const STORE_ORDER_TTL_MS = 48 * 60 * 60 * 1000;
