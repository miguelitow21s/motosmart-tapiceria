import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function logAdminActivity(params: {
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: Record<string, unknown>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  await supabase.from("admin_activity_logs").insert({
    admin_id: user?.id ?? null,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    detail: params.detail ?? {}
  });
}
