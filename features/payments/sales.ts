import { isPaidStatus, methodLabel, STATUS_LABEL, KIND_LABEL, type Order } from "./types.ts";

/*
  Cuentas de las ventas para el panel: meses en hora de Medellín, cifras de
  un periodo, desgloses y el CSV para el contador. Funciones puras (sin
  React ni base de datos) para poder probarlas solas: sales.test.ts.
*/

/** Colombia está en UTC-5 todo el año (sin horario de verano). */
const BOGOTA_OFFSET_MS = 5 * 3600 * 1000;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-11": el mes de una fecha en hora de Medellín. */
export function bogotaMonth(value: string | number | Date): string {
  const date = new Date(new Date(value).getTime() - BOGOTA_OFFSET_MS);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-11-25": el día de hoy en Medellín (para <input type="date">). */
export function bogotaDay(value: string | number | Date = Date.now()): string {
  return new Date(new Date(value).getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** El mes anterior a "2026-01" es "2025-12". */
export function previousMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

/** Los últimos n meses terminando en el actual, del más viejo al más nuevo. */
export function lastMonths(now: number, count: number): string[] {
  const keys = [bogotaMonth(now)];
  while (keys.length < count) keys.unshift(previousMonth(keys[0]));
  return keys;
}

/** "noviembre de 2026" o, corto, "nov". */
export function monthLabel(key: string, style: "long" | "short" | "initial" = "long"): string {
  const [year, month] = key.split("-").map(Number);
  const name = MONTHS[month - 1] ?? key;
  if (style === "short") return name.slice(0, 3);
  if (style === "initial") return name.slice(0, 1).toUpperCase();
  return `${name} de ${year}`;
}

/** Cuenta como venta cuando ya entró el dinero. Su fecha es la del pago. */
export function isSale(order: Order): boolean {
  return isPaidStatus(order.status) && !order.is_test;
}

export function saleMonth(order: Order): string {
  return bogotaMonth(order.paid_at ?? order.created_at);
}

export type Summary = {
  /** Suma de lo vendido. */
  total: number;
  /** Cuántas ventas. */
  count: number;
  /** Ticket promedio (0 sin ventas). */
  average: number;
  /** Ganancia de las ventas que tienen costo anotado. */
  profit: number;
  /** Cuántas de las ventas tienen costo (la ganancia solo cuenta esas). */
  withCost: number;
};

export function summarize(sales: Order[]): Summary {
  let total = 0;
  let profit = 0;
  let withCost = 0;
  for (const order of sales) {
    total += order.amount_cop;
    if (order.cost_cop != null) {
      profit += order.amount_cop - order.cost_cop;
      withCost += 1;
    }
  }
  return { total, count: sales.length, average: sales.length ? Math.round(total / sales.length) : 0, profit, withCost };
}

/** Ventas de un periodo: un mes ("2026-11") o los meses dados. */
export function salesIn(orders: Order[], months: string | string[]): Order[] {
  const wanted = new Set(Array.isArray(months) ? months : [months]);
  return orders.filter((order) => isSale(order) && wanted.has(saleMonth(order)));
}

export type MonthBucket = Summary & { key: string };

/** Lo vendido mes a mes en los últimos n meses (incluye los meses sin ventas). */
export function monthlySales(orders: Order[], now: number, count = 12): MonthBucket[] {
  const keys = lastMonths(now, count);
  const groups = new Map<string, Order[]>(keys.map((key) => [key, []]));
  for (const order of orders) {
    if (!isSale(order)) continue;
    groups.get(saleMonth(order))?.push(order);
  }
  return keys.map((key) => ({ key, ...summarize(groups.get(key) ?? []) }));
}

/** Cobros enviados que aún no se pagan (los cancelados no cuentan). */
export function receivable(orders: Order[]): { total: number; count: number } {
  const open = orders.filter((order) => order.status === "esperando_pago");
  return { total: open.reduce((sum, order) => sum + order.amount_cop, 0), count: open.length };
}

export type Share = { key: string; label: string; total: number; count: number };

function ranked(sales: Order[], keyOf: (order: Order) => { key: string; label: string }): Share[] {
  const groups = new Map<string, Share>();
  for (const order of sales) {
    const { key, label } = keyOf(order);
    const group = groups.get(key) ?? { key, label, total: 0, count: 0 };
    group.total += order.amount_cop;
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "es"));
}

/** Cómo pagaron: tarjeta, Nequi, efectivo... de mayor a menor. */
export function byMethod(sales: Order[]): Share[] {
  return ranked(sales, (order) => ({ key: order.payment_method ?? "", label: methodLabel(order.payment_method) }));
}

/** Qué se vendió: por diseño del catálogo; lo que no es de un diseño va junto. */
export function byDesign(sales: Order[]): Share[] {
  return ranked(sales, (order) =>
    order.design_name
      ? { key: `${order.brand_name ?? ""}/${order.design_name}`, label: order.brand_name ? `${order.design_name} · ${order.brand_name}` : order.design_name }
      : { key: "", label: "Trabajos a la medida" }
  );
}

/** Variación contra el periodo anterior; null si antes no hubo nada con qué comparar. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  // Un texto que empieza por = + - @ lo abre Excel como fórmula: se neutraliza.
  const safe = /^[=+\-@\t\r]/.test(text) && typeof value === "string" ? `'${text}` : text;
  // También las comas: si alguien lo abre con coma como separador, una
  // celda «x,=1+1» no se parte en una fórmula.
  return /[";,\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function csvDate(value: string | null): string {
  if (!value) return "";
  const local = new Date(new Date(value).getTime() - BOGOTA_OFFSET_MS).toISOString();
  return `${local.slice(0, 10)} ${local.slice(11, 16)}`;
}

/**
 * CSV para Excel en Colombia: separado por punto y coma, con BOM para que
 * las tildes se vean bien y las cifras como números enteros en pesos.
 */
export function ordersCsv(orders: Order[]): string {
  const header = [
    "Código",
    "Fecha del pedido",
    "Fecha del pago",
    "Estado",
    "Tipo",
    "Concepto",
    "Diseño",
    "Marca",
    "Cliente",
    "Celular",
    "Ciudad",
    "Medio de pago",
    "Monto (COP)",
    "Costo (COP)",
    "Ganancia (COP)",
    "Notas"
  ];
  const rows = orders.map((order) => [
    order.code,
    csvDate(order.created_at),
    csvDate(order.paid_at),
    STATUS_LABEL[order.status],
    KIND_LABEL[order.kind],
    order.description,
    order.design_name,
    order.brand_name,
    order.customer_name,
    order.customer_phone,
    order.customer_city,
    order.payment_method ? methodLabel(order.payment_method) : "",
    order.amount_cop,
    order.cost_cop,
    order.cost_cop != null && isSale(order) ? order.amount_cop - order.cost_cop : null,
    order.notes
  ]);
  return `﻿${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
}
