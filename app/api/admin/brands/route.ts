import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { assertCsrf, sanitizeText } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { invalidPayload, internalError } from "@/lib/api-response";

const brandSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(60, "El nombre admite maximo 60 caracteres"),
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(60, "El slug admite maximo 60 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede tener minusculas, numeros y guiones"),
  description: z.string().max(300, "La descripcion admite maximo 300 caracteres").default(""),
  // Campo de texto vaciado en el panel = "sin logo". Antes "" fallaba la
  // validacion de URL y la marca no se podia guardar.
  logo_url: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().url("Pega una URL valida o sube el logo").nullable().optional()
  ),
  is_active: z.boolean().default(true)
});

const DUPLICATE_BRAND_MESSAGE = "Ya existe una marca con ese slug. Usa otro nombre o slug.";

// El logo se sube antes de guardar la marca (una marca nueva aun no tiene id):
// al guardar, la foto que quedo como logo se vincula a la marca en la galeria.
async function linkLogoImage(supabase: ReturnType<typeof createAdminSupabaseClient>, brandId: string, logoUrl: string | null) {
  if (!logoUrl) return;
  const { error } = await supabase.from("images").update({ brand_id: brandId }).eq("storage_path", logoUrl).is("brand_id", null);
  if (error) console.error("brands linkLogoImage", error.message);
}

const deleteBrandSchema = z.object({
  id: z.string().uuid()
});

function getStoragePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/catalog/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function GET() {
  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id,name,slug,description,logo_url,is_active,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return internalError("brands GET", error);

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = brandSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  const supabase = createAdminSupabaseClient();
  const payload = {
    name: sanitizeText(parsed.data.name),
    slug: parsed.data.slug,
    description: sanitizeText(parsed.data.description),
    logo_url: parsed.data.logo_url ?? null,
    is_active: parsed.data.is_active
  };

  const { data: created, error } = await supabase.from("brands").insert(payload).select("id").single();
  if (error?.code === "23505") return NextResponse.json({ error: DUPLICATE_BRAND_MESSAGE }, { status: 409 });
  if (error) return internalError("brands POST", error);
  await linkLogoImage(supabase, created.id, payload.logo_url);
  await logAdminActivity({
    action: "create",
    entity: "brand",
    entityId: created.id,
    detail: { slug: payload.slug }
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = brandSchema.extend({ id: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  const supabase = createAdminSupabaseClient();
  const { id, ...rest } = parsed.data;
  const { error } = await supabase
    .from("brands")
    .update({
      ...rest,
      name: sanitizeText(rest.name),
      description: sanitizeText(rest.description),
      logo_url: rest.logo_url ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error?.code === "23505") return NextResponse.json({ error: DUPLICATE_BRAND_MESSAGE }, { status: 409 });
  if (error) return internalError("brands PATCH", error);
  await linkLogoImage(supabase, id, rest.logo_url ?? null);
  await logAdminActivity({
    action: "update",
    entity: "brand",
    entityId: id,
    detail: { slug: rest.slug, is_active: rest.is_active }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = deleteBrandSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  const supabase = createAdminSupabaseClient();

  const { count, error: countError } = await supabase
    .from("designs")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", parsed.data.id);

  if (countError) return internalError("brands DELETE count", countError);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar la marca porque tiene diseños asociados" },
      { status: 409 }
    );
  }

  // Fotos asociadas directamente a la marca (logos, no via un diseño): sin
  // esto, borrar la marca deja el archivo real huerfano en Storage.
  const { data: relatedImages } = await supabase
    .from("images")
    .select("storage_path")
    .eq("brand_id", parsed.data.id);

  const { error } = await supabase.from("brands").delete().eq("id", parsed.data.id);
  if (error) return internalError("brands DELETE", error);

  const paths = (relatedImages ?? [])
    .map((img) => getStoragePathFromPublicUrl(img.storage_path))
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    const { error: rmError } = await supabase.storage.from("catalog").remove(paths);
    if (rmError) console.error("brands DELETE storage (huerfanos):", paths, rmError.message);
  }

  await logAdminActivity({
    action: "delete",
    entity: "brand",
    entityId: parsed.data.id,
    detail: { hardDelete: true, removedImages: paths.length }
  });

  return NextResponse.json({ ok: true });
}
