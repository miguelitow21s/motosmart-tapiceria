// Pruebas de las cuentas de ventas. Correr: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { bogotaDay, bogotaMonth, byDesign, byMethod, change, lastMonths, monthlySales, ordersCsv, receivable, salesIn, summarize } from "./sales.ts";
import type { Order } from "./types.ts";

let next = 0;
function order(changes: Partial<Order>): Order {
  next += 1;
  return {
    id: `id-${next}`,
    code: `MS-${next}`,
    token: `t${next}`,
    kind: "tienda",
    status: "pagado",
    design_id: null,
    design_name: null,
    brand_name: null,
    description: "Silla",
    customer_name: null,
    customer_phone: null,
    customer_email: null,
    customer_city: null,
    notes: null,
    amount_cop: 100000,
    cost_cop: null,
    payment_method: "CARD",
    paid_at: "2026-11-10T15:00:00.000Z",
    is_test: false,
    created_at: "2026-11-10T14:00:00.000Z",
    updated_at: "2026-11-10T15:00:00.000Z",
    ...changes
  };
}

test("el mes se cuenta en hora de Medellín", () => {
  // 1 de diciembre a las 2 a. m. UTC todavía es 30 de noviembre en Medellín.
  assert.equal(bogotaMonth("2026-12-01T02:00:00.000Z"), "2026-11");
  assert.equal(bogotaMonth("2026-12-01T05:00:00.000Z"), "2026-12");
  assert.equal(bogotaDay("2026-12-01T02:00:00.000Z"), "2026-11-30");
});

test("los últimos meses cruzan el cambio de año", () => {
  assert.deepEqual(lastMonths(Date.parse("2026-02-15T12:00:00Z"), 4), ["2025-11", "2025-12", "2026-01", "2026-02"]);
});

test("solo cuentan los pedidos pagados, por la fecha del pago", () => {
  const orders = [
    order({ amount_cop: 200000, cost_cop: 120000 }),
    order({ status: "entregado", amount_cop: 100000 }),
    order({ status: "esperando_pago", paid_at: null, amount_cop: 999000 }),
    order({ status: "cancelado", paid_at: null, amount_cop: 50000 }),
    // Pagado con llaves de pruebas: no es venta.
    order({ is_test: true, amount_cop: 777000 }),
    // Pedido de octubre pagado en noviembre: es venta de noviembre.
    order({ created_at: "2026-10-30T20:00:00.000Z", paid_at: "2026-11-02T15:00:00.000Z", amount_cop: 30000 })
  ];
  const november = summarize(salesIn(orders, "2026-11"));
  assert.equal(november.total, 330000);
  assert.equal(november.count, 3);
  assert.equal(november.average, 110000);
  assert.equal(november.profit, 80000);
  assert.equal(november.withCost, 1);
  assert.deepEqual(receivable(orders), { total: 999000, count: 1 });
});

test("la serie mensual incluye los meses vacíos", () => {
  const months = monthlySales([order({}), order({ paid_at: "2026-09-05T15:00:00.000Z" })], Date.parse("2026-11-25T12:00:00Z"), 3);
  assert.deepEqual(
    months.map((month) => [month.key, month.total]),
    [
      ["2026-09", 100000],
      ["2026-10", 0],
      ["2026-11", 100000]
    ]
  );
});

test("desgloses de mayor a menor", () => {
  const sales = [
    order({ payment_method: "NEQUI", amount_cop: 50000 }),
    order({ payment_method: "CARD", amount_cop: 300000, design_name: "RX 100", brand_name: "Yamaha" }),
    order({ payment_method: "NEQUI", amount_cop: 60000 })
  ];
  assert.deepEqual(
    byMethod(sales).map((share) => [share.label, share.total, share.count]),
    [
      ["Tarjeta", 300000, 1],
      ["Nequi", 110000, 2]
    ]
  );
  assert.deepEqual(
    byDesign(sales).map((share) => share.label),
    ["RX 100 · Yamaha", "Trabajos a la medida"]
  );
});

test("variación contra el periodo anterior", () => {
  assert.equal(change(150, 100), 0.5);
  assert.equal(change(10, 0), null);
});

test("CSV para Excel: punto y coma, comillas y sin fórmulas", () => {
  const csv = ordersCsv([order({ description: 'Silla "RX"; roja', customer_name: "=HYPERLINK(1)", cost_cop: 40000 })]);
  assert.ok(csv.startsWith("﻿Código;"));
  const line = csv.split("\r\n")[1];
  assert.ok(line.includes('"Silla ""RX""; roja"'));
  assert.ok(line.includes(";'=HYPERLINK(1);"));
  assert.ok(line.includes(";100000;40000;60000;"));
});
