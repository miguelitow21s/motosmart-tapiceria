import type { Order } from "@/features/payments/types";

/*
  Solo en local con ADMIN_DEMO=1: un cobro de muestra para revisar las
  páginas de pago sin leer ni escribir la base de producción.
  /pagar/demo-pendiente, /pagar/demo-pagado, /pagar/demo-cancelado.
*/
export function demoOrder(token: string): Order | null {
  const status = token === "demo-pagado" ? "pagado" : token === "demo-cancelado" ? "cancelado" : token === "demo-pendiente" ? "esperando_pago" : null;
  if (!status) return null;
  const now = new Date().toISOString();
  return {
    id: "00000000-0000-4000-8000-000000000001",
    code: "MS-7K2Q9D",
    token,
    kind: "cobro",
    status,
    design_id: null,
    design_name: null,
    brand_name: null,
    description: "Forro antideslizante para Yamaha DT 125, costura roja y marca bordada",
    customer_name: "Carlos Restrepo",
    customer_phone: "573001234567",
    customer_email: null,
    customer_city: "Medellín",
    notes: null,
    amount_cop: 185000,
    cost_cop: null,
    payment_method: status === "pagado" ? "NEQUI" : null,
    paid_at: status === "pagado" ? now : null,
    created_at: now,
    updated_at: now
  };
}
