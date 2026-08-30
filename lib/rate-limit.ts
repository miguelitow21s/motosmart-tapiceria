import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const WINDOW_MINUTES = 15;
const LIMIT = 8;

// Antes era un Map en memoria: en Vercel cada instancia lambda tiene el suyo
// y se recicla constantemente, asi que el limite nunca se materializaba en
// produccion. Ahora cuenta intentos fallidos reales en login_attempts, que
// solo el servidor puede escribir (ver migraciones 008/011). Se cuenta por
// email, no por IP: la cabecera x-forwarded-for la puede influir el cliente.
export async function checkRateLimit(email: string) {
  const supabase = createAdminSupabaseClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email.toLowerCase())
    .eq("success", false)
    .gte("created_at", since);

  if (error) {
    // No bloquear el login por un fallo de infraestructura del propio
    // contador: Supabase Auth sigue siendo la defensa real contra fuerza
    // bruta (bloqueo propio + captcha si esta configurado).
    console.error("checkRateLimit", error.message);
    return { allowed: true, remaining: LIMIT, retryAfterMs: 0 };
  }

  const attempts = count ?? 0;
  if (attempts >= LIMIT) {
    return { allowed: false, remaining: 0, retryAfterMs: WINDOW_MINUTES * 60 * 1000 };
  }

  return { allowed: true, remaining: LIMIT - attempts, retryAfterMs: 0 };
}
