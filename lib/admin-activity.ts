import { refreshStore } from "@/lib/store-cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function logAdminActivity(params: {
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: Record<string, unknown>;
}) {
  // Todo cambio del panel pasa por aquí (cada handler de escritura lo
  // registra): es el punto único para regenerar la tienda.
  refreshStore();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("admin_activity_logs").insert({
    admin_id: user?.id ?? null,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    detail: params.detail ?? {}
  });

  // Un log de auditoria que puede fallar en silencio genera confianza
  // infundada en su completitud: si esto falla, que quede en los logs del
  // servidor aunque no se pueda bloquear la operacion que ya se ejecuto.
  if (error) {
    console.error("logAdminActivity FALLO - accion sin registrar:", params.action, params.entity, error.message);
  }
}
