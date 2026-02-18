import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const eventSchema = z.object({
  name: z.string().min(2).max(100),
  payload: z.record(z.any()).optional()
});

export async function POST(request: Request) {
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  await supabase.from("analytics_events").insert({
    event_name: parsed.data.name,
    payload: parsed.data.payload ?? {},
    ip
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
