import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll se llama tambien desde Server Components (paginas,
            // layout), donde Next.js prohibe escribir cookies y lanza. Es
            // el comportamiento esperado del patron oficial de @supabase/ssr:
            // se ignora aqui porque middleware.ts ya refresca la sesion en
            // cada request. Sin este catch, cualquier visitante con una
            // cookie de sesion que necesite refrescarse tumbaba la pagina
            // completa con un 500 ("Cookies can only be modified in a
            // Server Action or Route Handler").
          }
        }
      }
    }
  );
}
