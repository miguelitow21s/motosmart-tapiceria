import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertCsrf, loginSchema } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";
import { parseRoleRow } from "@/lib/role";

// NO añadir aqui credenciales de bootstrap ni rutas de recuperacion de admin.
// El alta de administradores se hace desde el Dashboard de Supabase
// (ver supabase/fresh_start_runbook.md). Un endpoint publico jamas debe poder
// crear usuarios ni cambiar contraseñas.

function isSupabaseInfrastructureError(error: { status?: number; code?: string } | null | undefined) {
  if (!error) return false;
  return (error.status ?? 0) >= 500 || error.code === "unexpected_failure";
}

// login_attempts es un log de auditoria: solo lo escribe el servidor con
// service_role. Un fallo al registrar nunca debe impedir el login.
async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  try {
    const adminClient = createAdminSupabaseClient();
    await adminClient.from("login_attempts").insert({ email: email.toLowerCase(), ip, success });
  } catch (error) {
    console.error("recordLoginAttempt", error);
  }
}

async function syncRoleMetadataAfterSignIn(user: { id: string; app_metadata?: Record<string, unknown> | null }) {
  const adminClient = createAdminSupabaseClient();

  const profile = await adminClient
    .from("users")
    .select("roles(name)")
    .eq("id", user.id)
    .maybeSingle();

  const dbRole = parseRoleRow(profile.data);
  if (!dbRole) return;

  const currentRole = typeof user.app_metadata?.role === "string" ? user.app_metadata.role : undefined;
  if (currentRole === dbRole) return;

  await adminClient.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...(user.app_metadata ?? {}),
      role: dbRole,
      provider: "email",
      providers: ["email"]
    }
  });
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const state = await checkRateLimit(parsed.data.email);

  if (!state.allowed) {
    return NextResponse.json(
      {
        error: "Demasiados intentos. Intenta luego.",
        retryAfterMs: state.retryAfterMs
      },
      { status: 429 }
    );
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerSupabaseClient(request, response);

  const signInResult = await supabase.auth.signInWithPassword(parsed.data);

  if (signInResult.error) {
    await recordLoginAttempt(parsed.data.email, ip, false);

    if (isSupabaseInfrastructureError(signInResult.error)) {
      console.error("login: fallo de infraestructura de Supabase Auth", signInResult.error);
      return NextResponse.json(
        { error: "Servicio de autenticacion no disponible" },
        { status: 503 }
      );
    }

    // Respuesta identica para cualquier email: no revelar que cuentas existen
    // ni cual es la del administrador.
    return NextResponse.json({ error: "Credenciales invalidas" }, { status: 401 });
  }

  await recordLoginAttempt(parsed.data.email, ip, true);

  if (signInResult.data.user) {
    await syncRoleMetadataAfterSignIn(signInResult.data.user);
  }

  return response;
}
