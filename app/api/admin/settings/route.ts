import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { assertCsrf } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { invalidPayload, internalError } from "@/lib/api-response";

// z.record(z.any()) no imponia forma, tamaño ni profundidad al JSON que
// termina en la base de datos. Los settings del panel son siempre texto,
// booleanos o listas de ids; acotarlo evita anidacion arbitraria.
const settingValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
]);

const settingSchema = z.object({
  key: z.string().min(2).max(100),
  value: settingValueSchema
});

export async function GET() {
  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("settings")
    .select("id,key,value,is_public,updated_at")
    .order("key");
  if (error) return internalError("settings GET", error);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = settingSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("settings").upsert(parsed.data, { onConflict: "key" });
  if (error) return internalError("settings POST", error);
  await logAdminActivity({
    action: "upsert",
    entity: "setting",
    entityId: parsed.data.key,
    detail: { key: parsed.data.key }
  });
  return NextResponse.json({ ok: true });
}
