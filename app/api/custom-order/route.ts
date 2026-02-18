import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertCsrf, customOrderSchema, sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = customOrderSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud invalida" }, { status: 400 });
  }

  const safe = Object.fromEntries(
    Object.entries(parsed.data).map(([key, value]) => [
      key,
      typeof value === "string" ? sanitizeText(value) : value
    ])
  );

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("custom_orders").insert({
    user_id: user?.id ?? null,
    payload: safe,
    status: "pending"
  });

  if (error) {
    return NextResponse.json({ error: "No fue posible guardar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
