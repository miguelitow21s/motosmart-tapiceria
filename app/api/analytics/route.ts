import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const eventSchema = z.object({
  name: z.string().min(2).max(100),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});

export async function POST(request: Request) {
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  // Antes usaba el cliente anon: con RLS "with check (true)" y grant insert a
  // anon, cualquiera podia escribir directo contra PostgREST con la anon key
  // (publica por diseno), sin pasar por este endpoint. La migracion 011
  // revoca ese insert; ahora solo el servidor escribe, con service_role.
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("analytics_events").insert({
    event_name: parsed.data.name,
    payload: parsed.data.payload ?? {},
    ip
  });

  if (error) {
    console.error("analytics insert", error.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
