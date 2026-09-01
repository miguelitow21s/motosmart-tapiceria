import { createServerClient } from "@supabase/ssr";
import type { NextResponse } from "next/server";

// Cliente Supabase para Route Handlers que necesitan construir la cookie de
// sesion sobre un NextResponse propio (login/logout), en vez de sobre
// next/headers (eso lo cubre lib/supabase/server.ts). Unico parseo de la
// cabecera Cookie del proyecto: si cambia el formato, se toca aqui una vez.
export function createRouteHandlerSupabaseClient(request: Request, response: NextResponse) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return (
          request.headers
            .get("cookie")
            ?.split(";")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => {
              const [name, ...rest] = entry.split("=");
              return { name, value: rest.join("=") };
            }) ?? []
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });
}
