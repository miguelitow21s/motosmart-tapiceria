import { createServerSupabaseClient } from "@/lib/supabase/server";

type FeatureName =
  | "catalog_enabled"
  | "customizer_enabled"
  | "checkout_enabled"
  | "admin_uploads_enabled"
  | "riders_enabled";

export async function isFeatureEnabled(name: FeatureName) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("features")
    .select("enabled")
    .eq("name", name)
    .maybeSingle();

  // Falla cerrado: este flag controla capacidades privilegiadas (admin_uploads_enabled).
  // Un control que se enciende solo cuando algo va mal no es un control.
  if (error) {
    console.error("isFeatureEnabled", name, error.message);
    return false;
  }
  if (!data) return false;
  return Boolean(data.enabled);
}

export async function getAllFeatures() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("features").select("name,enabled").order("name");
  return data ?? [];
}
