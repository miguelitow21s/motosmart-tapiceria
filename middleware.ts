import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function generateCsrfToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Patron canonico de @supabase/ssr. El orden importa:
        // NextResponse.next({ request }) copia las cabeceras de request DE FORMA
        // SINCRONA al construirse, y esa copia es la que Next reenvia a los
        // Server Components. Si la respuesta se crea antes de mutar
        // request.cookies, los RSC de esta misma peticion leen el token viejo
        // y la sesion se rompe de forma intermitente al refrescar.
        // Por eso hay que RECREAR la respuesta despues de mutar request.
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  // Traslada a una respuesta terminal (redirect) las cookies de sesion que
  // Supabase haya refrescado, para no perder el refresco al redirigir.
  function withSessionCookies(target: NextResponse) {
    response.cookies.getAll().forEach((cookie) => {
      target.cookies.set(cookie);
    });
    return target;
  }

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return withSessionCookies(NextResponse.redirect(new URL("/login", request.url)));
    }

    const { data: profile, error } = await supabase
      .from("users")
      .select("roles(name)")
      .eq("id", user.id)
      .maybeSingle();

    // Falla cerrado y solo confia en la BD. NO anadas fallbacks a
    // user_metadata (lo escribe el propio usuario -> escalada a admin)
    // ni a app_metadata (copia que puede quedar obsoleta).
    if (error) {
      console.error("middleware: no se pudo resolver el rol", error.message);
      return withSessionCookies(NextResponse.redirect(new URL("/", request.url)));
    }

    const role = (profile as { roles?: { name?: string } | null } | null)?.roles?.name ?? null;

    if (role !== "admin" && role !== "editor") {
      return withSessionCookies(NextResponse.redirect(new URL("/", request.url)));
    }
  }

  // El CSRF va al final, sobre la respuesta definitiva: si se pusiera antes,
  // el recreado de `response` dentro de setAll lo descartaria.
  if (!request.cookies.get("csrf-token")?.value) {
    response.cookies.set("csrf-token", generateCsrfToken(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/"
    });
  }

  response.headers.set("x-request-id", crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/api/:path*"]
};
