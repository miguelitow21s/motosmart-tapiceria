import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type FeatureName =
  | "catalog_enabled"
  | "customizer_enabled"
  | "checkout_enabled"
  | "admin_uploads_enabled"
  | "riders_enabled";

const PUBLIC_FLAGS = new Set<FeatureName>(["catalog_enabled", "customizer_enabled", "checkout_enabled", "riders_enabled"]);

/**
 * `onError: "closed"` (por defecto): si la consulta falla, apagado. Es lo que
 * piden las capacidades privilegiadas (admin_uploads_enabled): un control que
 * se enciende solo cuando algo va mal no es un control.
 * `onError: "open"`: para páginas públicas, una caída pasajera no debe mandar
 * al visitante al inicio como si la página estuviera apagada; la página sigue
 * y, si la base de verdad no responde, la atrapa app/error.tsx.
 */
export async function isFeatureEnabled(name: FeatureName, { onError = "closed" }: { onError?: "open" | "closed" } = {}) {
  // Los módulos de la tienda los lee anon (sin cookies: la página se puede
  // cachear). admin_uploads_enabled solo lo ve una sesión de admin (RLS, 011).
  const supabase = PUBLIC_FLAGS.has(name) ? createPublicSupabaseClient() : await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("features")
    .select("enabled")
    .eq("name", name)
    .maybeSingle();

  if (error) {
    console.error("isFeatureEnabled", name, error.message);
    return onError === "open";
  }
  if (!data) return false;
  return Boolean(data.enabled);
}
