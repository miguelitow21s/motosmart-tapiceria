import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUserRole() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { user: null, role: null };

  const { data, error } = await supabase
    .from("users")
    .select("id, roles(name)")
    .eq("id", user.id)
    .maybeSingle();

  // La BD es la UNICA fuente de verdad del rol.
  //
  // NO reintroduzcas fallbacks a los metadatos del usuario:
  // - user_metadata lo escribe el propio usuario con su JWT
  //   (POST /auth/v1/user con la anon key). Confiar en el es escalada directa
  //   a admin: basta registrarse con {"data":{"role":"admin"}}.
  // - app_metadata solo es una copia que syncRoleMetadataAfterSignIn escribe
  //   desde la BD; puede quedar obsoleta si se degrada a alguien.
  if (error) {
    console.error("getCurrentUserRole: no se pudo resolver el rol", error.message);
    return { user, role: null };
  }

  const role = (data as { roles?: { name?: string } | null } | null)?.roles?.name ?? null;
  return { user, role };
}

export function canAccessAdmin(role: string | null) {
  return role === "admin" || role === "editor";
}
