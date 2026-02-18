import { createServerSupabaseClient } from "@/lib/supabase/server";

type FeatureName =
  | "catalog_enabled"
  | "customizer_enabled"
  | "checkout_enabled"
  | "admin_uploads_enabled";

export async function isFeatureEnabled(name: FeatureName) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("features")
    .select("enabled")
    .eq("name", name)
    .maybeSingle();

  if (error) return true; // si hay error de red/tabla, no bloqueamos la funcionalidad
  if (data?.enabled === undefined || data === null) return true; // default on si no hay fila
  return Boolean(data.enabled);
}

export async function getAllFeatures() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("features").select("name,enabled").order("name");
  return data ?? [];
}
