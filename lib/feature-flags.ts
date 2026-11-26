import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { wompiConfig } from "@/lib/wompi";

type FeatureName =
  | "catalog_enabled"
  | "customizer_enabled"
  | "checkout_enabled"
  | "admin_uploads_enabled"
  | "riders_enabled"
  | "payments_enabled";

const PUBLIC_FLAGS = new Set<FeatureName>([
  "catalog_enabled",
  "customizer_enabled",
  "checkout_enabled",
  "riders_enabled",
  "payments_enabled"
]);

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

/**
 * "Arma tu silla" (la silla en 3D): se ve con el módulo encendido. Con
 * ADMIN_DEMO=1 (solo en local) se ve siempre, para revisarla sin tocar la base.
 */
export async function isCustomizerEnabled(options: { onError?: "open" | "closed" } = {}) {
  return process.env.ADMIN_DEMO === "1" || isFeatureEnabled("customizer_enabled", options);
}

/**
 * Pagos en línea: el módulo encendido Y las cuatro llaves de Wompi en Vercel.
 *   off   falta algo: la tienda sigue cotizando por WhatsApp como siempre.
 *   test  llaves de pruebas: la tienda no muestra «Comprar»; solo el
 *         administrador con sesión puede ensayar (features/payments/server/access).
 *   live  llaves de producción: cualquiera compra.
 * Con ADMIN_DEMO=1 (solo en local) los botones se ven para revisarlos, pero
 * no crean pedidos ni van a Wompi.
 */
export async function paymentsMode(options: { onError?: "open" | "closed" } = {}): Promise<"off" | "test" | "live"> {
  if (process.env.ADMIN_DEMO === "1") return "live";
  const config = wompiConfig();
  if (!config) return "off";
  if (!(await isFeatureEnabled("payments_enabled", options))) return "off";
  return config.environment === "prod" ? "live" : "test";
}
