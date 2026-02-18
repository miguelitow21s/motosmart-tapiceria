import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUserRole() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { user: null, role: null };

  const { data } = await supabase
    .from("users")
    .select("id, roles(name)")
    .eq("id", user.id)
    .single();

  const role =
    (data as { roles?: { name?: string } | null } | null)?.roles?.name ??
    (user.user_metadata.role as string | undefined) ??
    null;
  return { user, role };
}

export function canAccessAdmin(role: string | null) {
  return role === "admin" || role === "editor";
}
