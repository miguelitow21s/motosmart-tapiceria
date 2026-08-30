import { NextResponse } from "next/server";
import { canAccessAdmin, getCurrentUserRole, isAdmin } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { assertCsrf } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { internalError } from "@/lib/api-response";

const PURGE_OLDER_THAN_DAYS = 90;

export async function GET() {
  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("admin_activity_logs")
    .select("id,action,entity,entity_id,detail,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return internalError("activity GET", error);
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  // Solo admin, no editor: este endpoint decide que tan atras llega la unica
  // evidencia forense del panel. canAccessAdmin es demasiado permisivo aqui.
  const { role } = await getCurrentUserRole();
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cutoff = new Date(Date.now() - PURGE_OLDER_THAN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Registrar la purga ANTES de ejecutarla: si se borrara primero y se
  // registrara despues, un fallo a mitad de camino dejaria la purga sin
  // rastro, exactamente el problema que este endpoint existe para evitar.
  await logAdminActivity({ action: "purge", entity: "admin_activity_logs", detail: { cutoff } });

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("admin_activity_logs").delete().lt("created_at", cutoff);

  if (error) return internalError("activity DELETE", error);
  return NextResponse.json({ ok: true });
}
