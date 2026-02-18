import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { assertCsrf, loginSchema } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const serverSupabase = await createServerSupabaseClient();
    await serverSupabase.from("login_attempts").insert({
      email: parsed.data.email.toLowerCase(),
      ip,
      success: false
    });
    return NextResponse.json({ error: "Credenciales invalidas" }, { status: 401 });
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
