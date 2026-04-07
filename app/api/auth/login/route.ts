import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { assertCsrf, loginSchema } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ADMIN_BOOTSTRAP_EMAIL = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "nataliaagudelo@gmail.com").toLowerCase();
const ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "123456";

async function tryBootstrapAdminUser(email: string, password: string) {
  const normalizedEmail = email.toLowerCase();
  if (
    normalizedEmail !== ADMIN_BOOTSTRAP_EMAIL ||
    password !== ADMIN_BOOTSTRAP_PASSWORD
  ) {
    return { attempted: false, reason: "credentials-not-matching-bootstrap" as const };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { attempted: true, reason: "missing-service-role-key" as const };
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const listed = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) {
    return { attempted: true, reason: "list-users-failed" as const };
  }
  const existing = listed.data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);

  let userId = existing?.id;
  if (!existing) {
    const created = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { role: "admin" },
      app_metadata: { role: "admin", provider: "email", providers: ["email"] }
    });
    if (created.error) {
      return { attempted: true, reason: "create-user-failed" as const };
    }
    userId = created.data.user?.id;
  } else {
    const updated = await adminClient.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata ?? {}), role: "admin" },
      app_metadata: { ...(existing.app_metadata ?? {}), role: "admin", provider: "email", providers: ["email"] }
    });
    if (updated.error) {
      return { attempted: true, reason: "update-user-failed" as const };
    }
  }

  if (!userId) return { attempted: true, reason: "missing-user-id" as const };

  const role = await adminClient.from("roles").select("id").eq("name", "admin").maybeSingle();
  const roleId = role.data?.id;
  if (!roleId) return { attempted: true, reason: "admin-role-not-found" as const };

  const upserted = await adminClient.from("users").upsert(
    {
      id: userId,
      role_id: roleId,
      full_name: "Natalia Agudelo",
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );
  if (upserted.error) {
    return { attempted: true, reason: "upsert-profile-failed" as const };
  }

  return { attempted: true, reason: "ok" as const };
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
    return NextResponse.json(
      {
        error: "Datos invalidos",
        detail: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const key = `${ip}:${parsed.data.email.toLowerCase()}`;
  const state = checkRateLimit(key);

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
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers
            .get("cookie")
            ?.split(";")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => {
              const [name, ...rest] = entry.split("=");
              return { name, value: rest.join("=") };
            }) ?? [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  let signInResult = await supabase.auth.signInWithPassword(parsed.data);
  let bootstrapResult: { attempted: boolean; reason: string } = {
    attempted: false,
    reason: "not-required"
  };

  if (signInResult.error) {
    bootstrapResult = await tryBootstrapAdminUser(parsed.data.email, parsed.data.password);
    signInResult = await supabase.auth.signInWithPassword(parsed.data);
  }

  if (signInResult.error) {
    const serverSupabase = await createServerSupabaseClient();
    await serverSupabase.from("login_attempts").insert({
      email: parsed.data.email.toLowerCase(),
      ip,
      success: false
    });
    const isAdminBootstrapAttempt = parsed.data.email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL;
    return NextResponse.json(
      {
        error: "Credenciales invalidas",
        detail: isAdminBootstrapAttempt
          ? {
              bootstrap: bootstrapResult.reason,
              hint:
                bootstrapResult.reason === "missing-service-role-key"
                  ? "Configura SUPABASE_SERVICE_ROLE_KEY en Vercel y redeploy."
                  : "Verifica que el proyecto de Supabase y las variables de entorno coincidan con produccion."
            }
          : undefined
      },
      { status: 401 }
    );
  }

  clearRateLimit(key);
  const serverSupabase = await createServerSupabaseClient();
  await serverSupabase.from("login_attempts").insert({
    email: parsed.data.email.toLowerCase(),
    ip,
    success: true
  });

  return response;
}
