import { ORDER_KINDS, ORDER_STATUSES, type Order, type OrderKind, type OrderStatus, type PaymentAttempt } from "./types.ts";

/*
  Filas de /api/admin/orders a los tipos del panel. La base ya garantiza las
  formas (check constraints), pero el panel no confía a ciegas: un número que
  llega como texto o un estado desconocido no rompe la pestaña.
*/

type Row = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value : "");
const nullableText = (value: unknown) => (typeof value === "string" && value ? value : null);
const num = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function mapOrder(raw: unknown): Order {
  const row = (raw ?? {}) as Row;
  const status = ORDER_STATUSES.includes(row.status as OrderStatus) ? (row.status as OrderStatus) : "esperando_pago";
  const kind = ORDER_KINDS.includes(row.kind as OrderKind) ? (row.kind as OrderKind) : "cobro";
  return {
    id: text(row.id),
    code: text(row.code),
    token: text(row.token),
    kind,
    status,
    design_id: nullableText(row.design_id),
    design_name: nullableText(row.design_name),
    brand_name: nullableText(row.brand_name),
    description: text(row.description),
    customer_name: nullableText(row.customer_name),
    customer_phone: nullableText(row.customer_phone),
    customer_email: nullableText(row.customer_email),
    customer_city: nullableText(row.customer_city),
    notes: nullableText(row.notes),
    amount_cop: num(row.amount_cop),
    cost_cop: row.cost_cop == null ? null : num(row.cost_cop),
    payment_method: nullableText(row.payment_method),
    paid_at: nullableText(row.paid_at),
    is_test: row.is_test === true,
    created_at: text(row.created_at),
    updated_at: text(row.updated_at)
  };
}

const ATTEMPT_STATUSES: PaymentAttempt["status"][] = ["PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR"];

export function mapAttempt(raw: unknown): PaymentAttempt {
  const row = (raw ?? {}) as Row;
  const status = ATTEMPT_STATUSES.includes(row.status as PaymentAttempt["status"]) ? (row.status as PaymentAttempt["status"]) : "ERROR";
  return {
    id: text(row.id),
    reference: text(row.reference),
    status,
    amount_in_cents: num(row.amount_in_cents),
    wompi_transaction_id: nullableText(row.wompi_transaction_id),
    payment_method_type: nullableText(row.payment_method_type),
    environment: row.environment === "test" || row.environment === "prod" ? row.environment : null,
    created_at: text(row.created_at),
    updated_at: text(row.updated_at)
  };
}
