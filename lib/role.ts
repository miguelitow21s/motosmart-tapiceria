// Parser puro y sin dependencias de Next/Node: seguro de importar tanto en
// Route Handlers y Server Components como en middleware (Edge Runtime).
// Unico punto que interpreta la forma del embed `roles(name)` de Supabase.
//
// PostgREST no garantiza el shape a nivel de tipos para un embed to-one sin
// generar tipos desde el esquema: puede tipar `roles` como objeto o como
// array de un elemento. Se manejan ambos para no romper en silencio si eso
// cambia (el fallo cerrado sigue intacto: cualquier forma inesperada da null).
export type RoleJoinResult =
  | { roles?: { name?: string | null } | { name?: string | null }[] | null }
  | null;

export function parseRoleRow(data: RoleJoinResult): string | null {
  const roles = data?.roles;
  if (!roles) return null;
  if (Array.isArray(roles)) return roles[0]?.name ?? null;
  return roles.name ?? null;
}
