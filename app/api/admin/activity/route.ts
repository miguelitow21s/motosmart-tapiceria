import { NextResponse } from "next/server";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { assertCsrf } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET() {
  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("admin_activity_logs")
    .select("id,action,entity,entity_id,detail,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("admin_activity_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
