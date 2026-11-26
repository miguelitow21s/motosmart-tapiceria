"use client";

import { adminGet, adminSend } from "@/features/admin/lib/admin-fetch";
import { notify } from "@/features/admin/lib/feedback";
import { getAdminState, setAdminState } from "@/features/admin/store/admin-data";
import { mapAttempt, mapOrder } from "@/features/payments/map";
import type { ManualMethod, Order, OrderStatus, PaymentAttempt } from "@/features/payments/types";
import { buildWhatsAppUrl } from "@/lib/settings-defaults";
import { formatCOP } from "@/lib/utils";

/*
  Pedidos y ventas desde el panel. La respuesta del servidor trae el pedido
  completo, así que la lista se actualiza sin volver a pedirla toda.
*/

export type CustomerFields = {
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_city?: string | null;
  notes?: string | null;
};

export type NewCharge = CustomerFields & {
  kind: "cobro";
  description: string;
  amount_cop: number;
  cost_cop?: number | null;
};

export type NewSale = CustomerFields & {
  kind: "manual";
  description: string;
  amount_cop: number;
  cost_cop?: number | null;
  payment_method: ManualMethod;
  paid_on?: string;
  design_id?: string | null;
};

export type OrderChanges = CustomerFields & {
  status?: OrderStatus;
  cost_cop?: number | null;
  payment_method?: ManualMethod;
};

function upsert(order: Order) {
  const { orders } = getAdminState();
  const exists = orders.some((item) => item.id === order.id);
  setAdminState({ orders: exists ? orders.map((item) => (item.id === order.id ? order : item)) : [order, ...orders] });
}

/** Crea un cobro por enlace o registra una venta hecha fuera de la página. */
export async function createOrder(input: NewCharge | NewSale): Promise<Order | null> {
  const res = await adminSend<{ data?: unknown }>(
    "/api/admin/orders",
    "POST",
    input,
    input.kind === "cobro" ? "No se pudo crear el cobro." : "No se pudo registrar la venta."
  );
  if (!res.ok) {
    notify("error", res.error);
    return null;
  }
  const order = mapOrder(res.data.data);
  upsert(order);
  notify("success", input.kind === "cobro" ? `Cobro ${order.code} creado` : `Venta ${order.code} registrada`);
  return order;
}

export async function updateOrder(order: Order, changes: OrderChanges, successText = "Pedido guardado"): Promise<Order | null> {
  const res = await adminSend<{ data?: unknown }>("/api/admin/orders", "PATCH", { id: order.id, ...changes }, "No se pudo guardar el pedido.");
  if (!res.ok) {
    notify("error", res.error);
    return null;
  }
  const saved = mapOrder(res.data.data);
  upsert(saved);
  notify("success", successText);
  return saved;
}

/** Intentos de pago de un pedido (cada vez que el cliente abrió Wompi). */
export async function loadAttempts(order: Order): Promise<PaymentAttempt[] | string> {
  const res = await adminGet<{ data?: unknown[] }>(
    `/api/admin/orders?id=${encodeURIComponent(order.id)}`,
    "No se pudieron cargar los intentos de pago."
  );
  if (!res.ok) return res.error;
  return (res.data.data ?? []).map(mapAttempt);
}

/** Enlace que se le manda al cliente para pagar un cobro. */
export function payLink(order: Order, siteUrl: string) {
  const base = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}/pagar/${order.token}`;
}

/** WhatsApp al cliente con el enlace de pago ya escrito. Sin celular, abre WhatsApp para elegir a quién. */
export function payLinkWhatsApp(order: Order, siteUrl: string) {
  const name = order.customer_name?.split(" ")[0];
  const message = [
    `Hola${name ? ` ${name}` : ""}, te escribimos de MotoSmart Tapicería.`,
    `Este es el enlace para pagar ${order.description} (${formatCOP(order.amount_cop)}):`,
    payLink(order, siteUrl),
    "Puedes pagar con tarjeta, PSE, Nequi o Bancolombia. Código del pedido: " + order.code
  ].join("\n");
  return order.customer_phone ? buildWhatsAppUrl(order.customer_phone, message) : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** WhatsApp al cliente, sin texto armado (para coordinar la entrega). */
export function customerWhatsApp(order: Order) {
  if (!order.customer_phone) return null;
  const name = order.customer_name?.split(" ")[0];
  return buildWhatsAppUrl(order.customer_phone, `Hola${name ? ` ${name}` : ""}, te escribimos de MotoSmart Tapicería por tu pedido ${order.code}.`);
}

/** Copia al portapapeles y solo avisa "copiado" si de verdad se copió. */
export async function copyText(text: string, successText: string) {
  try {
    await navigator.clipboard.writeText(text);
    notify("success", successText);
    return true;
  } catch {
    notify("error", "No se pudo copiar. Mantén presionado el enlace para copiarlo a mano.");
    return false;
  }
}
