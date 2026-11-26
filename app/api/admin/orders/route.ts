import { NextResponse } from "next/server";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { logAdminActivity } from "@/lib/admin-activity";
import { invalidPayload, internalError, readJson } from "@/lib/api-response";
import { getCurrentUserRole, isAdmin } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { MAX_PRICE } from "@/lib/price-limits";
import { assertCsrf, sanitizeText } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { wompiConfig, wompiSetupStatus } from "@/lib/wompi";
import { insertOrder, isMissingTable, ORDER_COLUMNS, PAYMENT_COLUMNS } from "@/features/payments/server/orders";
import { MANUAL_METHODS, MIN_CHARGE_COP, ORDER_STATUSES, type PaymentsSetup } from "@/features/payments/types";

/*
  Pedidos y ventas del panel.
    GET               todos los pedidos (los más nuevos primero) y el estado de Wompi
    GET ?id=<pedido>  los intentos de pago de un pedido
    POST              un cobro por enlace (kind "cobro") o una venta a mano ("manual")
    PATCH             estado, costo, notas o datos del cliente de un pedido
  Ni el monto ni el medio de pago de una venta de Wompi se cambian desde aquí:
  eso lo dice Wompi.
*/

// Supabase devuelve como mucho 1000 filas por consulta: se pide por páginas.
const PAGE = 1000;
const LIST_CAP = 20000;

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => sanitizeText(value))
    .transform((value) => value || null)
    .nullable()
    .optional();

const amount = z.number().int().min(MIN_CHARGE_COP, "El monto mínimo es $1.500").max(MAX_PRICE, "El monto es demasiado alto: revisa que no sobre un cero.");
const cost = z.number().int().min(0).max(MAX_PRICE).nullable().optional();
const phone = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value === "" || /^(57)?3\d{9}$/.test(value), "El celular debe tener 10 dígitos y empezar por 3")
  .transform((value) => (value === "" ? null : value.length === 10 ? `57${value}` : value))
  .nullable()
  .optional();

const customer = {
  customer_name: optionalText(120),
  customer_phone: phone,
  customer_email: z.union([z.literal(""), z.string().trim().email("Revisa el correo").max(160)]).transform((value) => value || null).nullable().optional(),
  customer_city: optionalText(120),
  notes: optionalText(1000)
};

const createSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("cobro"),
    description: z.string().transform((value) => sanitizeText(value)).pipe(z.string().min(2, "Escribe qué se cobra").max(300)),
    amount_cop: amount,
    cost_cop: cost,
    ...customer
  }),
  z.object({
    kind: z.literal("manual"),
    description: z.string().transform((value) => sanitizeText(value)).pipe(z.string().min(2, "Escribe qué se vendió").max(300)),
    amount_cop: amount,
    cost_cop: cost,
    payment_method: z.enum(MANUAL_METHODS),
    // Fecha en que entró el dinero (YYYY-MM-DD, hora de Medellín). Vacía: hoy.
    paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    design_id: z.string().uuid().nullable().optional(),
    ...customer
  })
]);

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES).optional(),
  cost_cop: cost,
  // Cómo entró el dinero cuando se marca pagado a mano (un cobro que pagaron por transferencia).
  payment_method: z.enum(MANUAL_METHODS).optional(),
  ...customer
});

async function setup(): Promise<PaymentsSetup> {
  const status = wompiSetupStatus();
  const enabled = await isFeatureEnabled("payments_enabled").catch(() => false);
  return { enabled, environment: status.environment, missing: status.missing, mixed: status.mixed };
}

async function guard(request?: Request) {
  if (request) {
    try {
      assertCsrf(request);
    } catch {
      return { error: NextResponse.json({ error: "CSRF invalido" }, { status: 403 }) };
    }
  }
  // Plata y datos de clientes: solo el administrador, no el editor del catálogo.
  const { user, role } = await getCurrentUserRole();
  if (!isAdmin(role)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

export async function GET(request: Request) {
  const access = await guard();
  if (access.error) return access.error;

  const supabase = createAdminSupabaseClient();
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Pedido no válido" }, { status: 400 });
    const { data, error } = await supabase
      .from("payments")
      .select(PAYMENT_COLUMNS)
      .eq("order_id", id)
      .order("created_at", { ascending: false });
    if (error) return internalError("orders GET attempts", error);
    return NextResponse.json({ data });
  }

  const [orders, payments] = await Promise.all([allOrders(supabase), setup()]);
  if (isMissingTable(orders.error)) {
    return NextResponse.json({ data: [], setup: { ...payments, migrationPending: true }, site: siteConfig.url });
  }
  if (orders.error) return internalError("orders GET", orders.error);
  return NextResponse.json({ data: orders.data, setup: payments, site: siteConfig.url });
}

/** Todos los pedidos, de 1000 en 1000 (las cifras de ventas se suman sobre la lista completa). */
async function allOrders(supabase: ReturnType<typeof createAdminSupabaseClient>) {
  const rows: unknown[] = [];
  for (let from = 0; from < LIST_CAP; from += PAGE) {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: rows, error: null };
  }
  console.warn("orders GET: se llegó al tope de", LIST_CAP, "pedidos");
  return { data: rows, error: null };
}

/** Medianoche de Medellín (UTC-5, sin horario de verano) del día dado, más el mediodía para no caer en el día anterior. */
function bogotaNoon(day: string) {
  return new Date(`${day}T12:00:00-05:00`).toISOString();
}

export async function POST(request: Request) {
  const access = await guard(request);
  if (access.error) return access.error;

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidPayload(parsed.error);
  const input = parsed.data;

  if (input.kind === "cobro") {
    const ready = wompiConfig() && (await isFeatureEnabled("payments_enabled"));
    if (!ready) {
      return NextResponse.json(
        { error: "Los pagos en línea están apagados: enciéndelos en «Módulos» (y revisa que Wompi esté conectado)." },
        { status: 409 }
      );
    }
  }

  const supabase = createAdminSupabaseClient();
  try {
    let designName: string | null = null;
    let brandName: string | null = null;
    if (input.kind === "manual" && input.design_id) {
      const { data } = await supabase.from("designs").select("name,brands(name)").eq("id", input.design_id).maybeSingle();
      const brand = (Array.isArray(data?.brands) ? data.brands[0] : data?.brands) as { name?: string } | undefined;
      designName = data?.name ?? null;
      brandName = brand?.name ?? null;
    }
    const order = await insertOrder(supabase, {
      kind: input.kind,
      description: input.description,
      amount_cop: input.amount_cop,
      cost_cop: input.cost_cop ?? null,
      customer_name: input.customer_name ?? null,
      customer_phone: input.customer_phone ?? null,
      customer_email: input.customer_email ?? null,
      customer_city: input.customer_city ?? null,
      notes: input.notes ?? null,
      design_id: input.kind === "manual" && designName ? (input.design_id ?? null) : null,
      design_name: designName,
      brand_name: brandName,
      created_by: access.user?.id ?? null,
      ...(input.kind === "manual"
        ? {
            status: "pagado" as const,
            payment_method: input.payment_method,
            paid_at: input.paid_on ? bogotaNoon(input.paid_on) : new Date().toISOString()
          }
        : {})
    });
    await logAdminActivity({
      action: input.kind === "cobro" ? "create_charge" : "register_sale",
      entity: "order",
      entityId: order.id,
      detail: { code: order.code, amount_cop: order.amount_cop },
      refresh: false
    });
    return NextResponse.json({ ok: true, data: order }, { status: 201 });
  } catch (error) {
    return internalError("orders POST", error);
  }
}

export async function PATCH(request: Request) {
  const access = await guard(request);
  if (access.error) return access.error;

  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidPayload(parsed.error);
  const { id, status, ...rest } = parsed.data;

  const supabase = createAdminSupabaseClient();
  const { data: current, error: readError } = await supabase
    .from("orders")
    .select("id,code,kind,status,paid_at,payment_method")
    .eq("id", id)
    .maybeSingle();
  if (readError) return internalError("orders PATCH read", readError);
  if (!current) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const now = new Date().toISOString();
  const changes: Record<string, unknown> = { updated_at: now };
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) changes[key] = value;
  }
  // El medio de pago de Wompi lo dice Wompi: solo se anota en ventas a mano o
  // en un cobro que se pagó por fuera (todavía sin medio).
  if ("payment_method" in changes && current.kind !== "manual" && current.payment_method) {
    delete changes.payment_method;
  }
  if (status && status !== current.status) {
    // Un pago que Wompi aprobó no se deshace desde el panel (el cliente
    // podría pagar dos veces); si hubo devolución, se marca «Cancelado».
    if (status === "esperando_pago") {
      const { count, error: approvedError } = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("order_id", id)
        .eq("status", "APPROVED");
      if (approvedError) return internalError("orders PATCH approved", approvedError);
      if (count) {
        return NextResponse.json(
          { error: "Este pedido ya lo pagaron por Wompi: no puede volver a «Esperando pago». Si devolviste la plata, márcalo «Cancelado»." },
          { status: 409 }
        );
      }
    }
    changes.status = status;
    // Pagado a mano (transferencia de un cobro, por ejemplo): queda la fecha.
    if ((status === "pagado" || status === "en_proceso" || status === "entregado") && !current.paid_at) {
      changes.paid_at = now;
    }
    if (status === "esperando_pago") changes.paid_at = null;
  }

  let update = supabase.from("orders").update(changes).eq("id", id);
  // Si el estado cambió mientras tanto (llegó el pago de Wompi), no se pisa.
  if ("status" in changes) update = update.eq("status", current.status);
  const { data, error } = await update.select(ORDER_COLUMNS).maybeSingle();
  if (error) return internalError("orders PATCH", error);
  if (!data) {
    return NextResponse.json({ error: "El pedido cambió mientras lo editabas (quizás entró el pago). Ciérralo y ábrelo de nuevo." }, { status: 409 });
  }

  await logAdminActivity({
    action: "update",
    entity: "order",
    entityId: id,
    detail: { code: current.code, ...(status && status !== current.status ? { status } : {}), ...("cost_cop" in changes ? { cost_cop: changes.cost_cop } : {}) },
    refresh: false
  });
  return NextResponse.json({ ok: true, data });
}
