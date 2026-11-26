import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parseTransaction, wompiConfig } from "@/lib/wompi";
import { verifyEvent, type WompiEvent } from "@/lib/wompi-crypto";
import { applyTransaction } from "@/features/payments/server/orders";

/*
  Eventos de Wompi (URL de eventos en comercios.wompi.co > Desarrolladores):
    https://<dominio>/api/pagos/wompi

  Wompi avisa aquí cada cambio de una transacción. Solo se cree lo que viene
  firmado con el secreto de eventos. Respuestas:
    200  procesado, repetido o ajeno (Wompi no reintenta)
    401  firma que no cuadra
    500  la base falló: Wompi reintenta (30 min, 3 h, 24 h)
*/

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = wompiConfig();
  if (!config) return NextResponse.json({ error: "Pagos no configurados" }, { status: 503 });

  const event = (await request.json().catch(() => null)) as WompiEvent | null;
  if (!event || typeof event !== "object") return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  if (!verifyEvent(event, config.eventsSecret, request.headers.get("x-event-checksum"))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  // Un evento de pruebas no toca los pedidos de producción (ni al revés).
  if (event.environment !== config.environment) return NextResponse.json({ ok: true, ignored: "environment" });
  if (event.event !== "transaction.updated") return NextResponse.json({ ok: true, ignored: "event" });

  const raw = (event.data as { transaction?: unknown } | undefined)?.transaction;
  const transaction = parseTransaction(raw);
  if (!transaction) return NextResponse.json({ ok: true, ignored: "transaction" });

  try {
    const result = await applyTransaction(createAdminSupabaseClient(), transaction, config.environment, raw);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("wompi webhook", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
