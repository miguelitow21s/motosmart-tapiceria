import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertCsrf } from "@/lib/security";

const featureSchema = z.object({
  name: z.string().min(2).max(120),
  enabled: z.boolean()
});

export async function GET() {
  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("features").select("name,enabled").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = featureSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("features")
    .update({ enabled: parsed.data.enabled, updated_at: new Date().toISOString() })
    .eq("name", parsed.data.name);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    action: "toggle_feature",
    entity: "feature",
    entityId: parsed.data.name,
    detail: { enabled: parsed.data.enabled }
  });

  return NextResponse.json({ ok: true });
}
