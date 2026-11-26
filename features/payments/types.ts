/*
  Pedidos y ventas: lo que comparten la tienda, el panel y el servidor.
  Los nombres de la base (esperando_pago, CARD...) se traducen aquí a
  palabras de la tienda.
*/

export const ORDER_STATUSES = ["esperando_pago", "pagado", "en_proceso", "entregado", "cancelado"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_KINDS = ["tienda", "cobro", "manual"] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  esperando_pago: "Esperando pago",
  pagado: "Pagado",
  en_proceso: "En el taller",
  entregado: "Entregado",
  cancelado: "Cancelado"
};

export const KIND_LABEL: Record<OrderKind, string> = {
  tienda: "Compra en la tienda",
  cobro: "Cobro por enlace",
  manual: "Venta registrada a mano"
};

/** Ya entró el dinero: cuenta como venta. */
export function isPaidStatus(status: OrderStatus) {
  return status === "pagado" || status === "en_proceso" || status === "entregado";
}

/** Medios de pago de Wompi y los de una venta a mano. */
export const METHOD_LABEL: Record<string, string> = {
  CARD: "Tarjeta",
  NEQUI: "Nequi",
  PSE: "PSE",
  BANCOLOMBIA_TRANSFER: "Botón Bancolombia",
  BANCOLOMBIA_QR: "QR Bancolombia",
  BANCOLOMBIA_COLLECT: "Corresponsal Bancolombia",
  BANCOLOMBIA_BNPL: "Bancolombia a cuotas",
  DAVIPLATA: "Daviplata",
  SU_PLUS: "SU+ Pay",
  PCOL: "Puntos Colombia",
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  DATAFONO: "Datáfono",
  OTRO: "Otro"
};

/** Medios que se eligen al registrar una venta a mano. */
export const MANUAL_METHODS = ["EFECTIVO", "TRANSFERENCIA", "DATAFONO", "OTRO"] as const;
export type ManualMethod = (typeof MANUAL_METHODS)[number];

export function methodLabel(method: string | null | undefined) {
  if (!method) return "Sin dato";
  return METHOD_LABEL[method] ?? method;
}

export type Order = {
  id: string;
  code: string;
  token: string;
  kind: OrderKind;
  status: OrderStatus;
  design_id: string | null;
  design_name: string | null;
  brand_name: string | null;
  description: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_city: string | null;
  notes: string | null;
  amount_cop: number;
  cost_cop: number | null;
  payment_method: string | null;
  paid_at: string | null;
  /** Pagado con llaves de pruebas de Wompi: un ensayo, no cuenta como venta. */
  is_test: boolean;
  created_at: string;
  updated_at: string;
};

export type PaymentAttempt = {
  id: string;
  reference: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  amount_in_cents: number;
  wompi_transaction_id: string | null;
  payment_method_type: string | null;
  environment: "test" | "prod" | null;
  created_at: string;
  updated_at: string;
};

export const ATTEMPT_LABEL: Record<PaymentAttempt["status"], string> = {
  PENDING: "En curso",
  APPROVED: "Aprobado",
  DECLINED: "Rechazado",
  VOIDED: "Anulado",
  ERROR: "Error"
};

/** Estado de la conexión con Wompi, tal como lo ve el panel (nunca las llaves). */
export type PaymentsSetup = {
  /** Módulo «Pagos en línea» encendido. */
  enabled: boolean;
  /** Ambiente de las llaves: pruebas o producción; null si faltan o no cuadran. */
  environment: "test" | "prod" | null;
  /** Variables de Vercel vacías. */
  missing: string[];
  /** Las tablas de pedidos todavía no existen (falta correr la migración 016). */
  migrationPending?: boolean;
  /** Las cuatro están, pero mezclan pruebas y producción. */
  mixed: boolean;
};

/** Monto mínimo que Wompi acepta (COP 1.500). */
export const MIN_CHARGE_COP = 1500;
