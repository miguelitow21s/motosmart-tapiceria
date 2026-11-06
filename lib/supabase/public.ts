import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
  Cliente para lo que la tienda lee sin sesión: diseños, marcas, textos y
  fotos. No toca cookies, así que las páginas públicas se generan una vez y se
  sirven desde caché (ISR, ver app/layout.tsx) en vez de renderizarse en cada
  visita. Lo que se ve lo deciden las políticas RLS de anon, las mismas que
  aplicaban antes a cualquier visitante sin sesión.
*/
let client: SupabaseClient | null = null;

export function createPublicSupabaseClient() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return client;
}
