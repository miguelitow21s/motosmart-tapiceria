import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { assertCsrf, sanitizeText } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { invalidPayload, internalError } from "@/lib/api-response";

const brandSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(60),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(300).default(""),
  logo_url: z.string().url().nullable().optional(),
  is_active: z.boolean().default(true)
});

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

  const { error } = await supabase.from("brands").insert(payload);
  if (error) return internalError("brands POST", error);
  await logAdminActivity({
    action: "create",
    entity: "brand",
    detail: { slug: payload.slug }
  });

  return NextResponse.json({ ok: true }, { status: 201 });
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

  if (error) return internalError("brands PATCH", error);
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
