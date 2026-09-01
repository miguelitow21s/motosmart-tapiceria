import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { assertCsrf, sanitizeText } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { invalidPayload, internalError } from "@/lib/api-response";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif"
};
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const uploadFieldsSchema = z.object({
  rider_name: z.string().min(2).max(80),
  moto_info: z.string().min(2).max(80)
});

const updateSchema = z.object({
  id: z.string().uuid(),
  rider_name: z.string().min(2).max(80).optional(),
  moto_info: z.string().min(2).max(80).optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional()
});

const deleteSchema = z.object({ id: z.string().uuid() });

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
    .from("rider_photos")
    .select("id,storage_path,rider_name,moto_info,is_active,display_order,created_at")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return internalError("rider-photos GET", error);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { user, role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const uploadsEnabled = await isFeatureEnabled("admin_uploads_enabled");
  if (!uploadsEnabled) return NextResponse.json({ error: "Feature disabled" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }

  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Maximo 8 MB por imagen" }, { status: 413 });
  }

  const parsedFields = uploadFieldsSchema.safeParse({
    rider_name: String(formData.get("rider_name") ?? ""),
    moto_info: String(formData.get("moto_info") ?? "")
  });
  if (!parsedFields.success) return invalidPayload(parsedFields.error);

  const adminClient = createAdminSupabaseClient();

  const { count: maxOrder } = await adminClient
    .from("rider_photos")
    .select("id", { count: "exact", head: true });

  const path = `catalog/riders/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await adminClient.storage.from("catalog").upload(path, file, {
    upsert: false,
    contentType: file.type
  });
  if (uploadError) return internalError("rider-photos POST upload", uploadError);

  const { data: pub } = adminClient.storage.from("catalog").getPublicUrl(path);

  const { error: insertError } = await adminClient.from("rider_photos").insert({
    storage_path: pub.publicUrl,
    rider_name: sanitizeText(parsedFields.data.rider_name),
    moto_info: sanitizeText(parsedFields.data.moto_info),
    display_order: maxOrder ?? 0,
    created_by: user?.id ?? null
  });

  if (insertError) return internalError("rider-photos POST insert", insertError);
  await logAdminActivity({
    action: "upload",
    entity: "rider_photo",
    detail: { path, rider_name: parsedFields.data.rider_name }
  });

  return NextResponse.json({ ok: true, url: pub.publicUrl }, { status: 201 });
}

export async function PATCH(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  const payload: Record<string, string | number | boolean> = {};
  if (parsed.data.rider_name !== undefined) payload.rider_name = sanitizeText(parsed.data.rider_name);
  if (parsed.data.moto_info !== undefined) payload.moto_info = sanitizeText(parsed.data.moto_info);
  if (parsed.data.is_active !== undefined) payload.is_active = parsed.data.is_active;
  if (parsed.data.display_order !== undefined) payload.display_order = parsed.data.display_order;

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("rider_photos").update(payload).eq("id", parsed.data.id);
  if (error) return internalError("rider-photos PATCH", error);

  await logAdminActivity({
    action: "update",
    entity: "rider_photo",
    entityId: parsed.data.id,
    detail: payload
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

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  const supabase = createAdminSupabaseClient();
  const { data: deleted, error } = await supabase
    .from("rider_photos")
    .delete()
    .eq("id", parsed.data.id)
    .select("storage_path");
  if (error) return internalError("rider-photos DELETE", error);

  const url = deleted?.[0]?.storage_path;
  const storagePath = url ? getStoragePathFromPublicUrl(url) : null;
  if (storagePath) {
    const { error: rmError } = await supabase.storage.from("catalog").remove([storagePath]);
    if (rmError) console.error("rider-photos DELETE storage (huerfano):", storagePath, rmError.message);
  }

  await logAdminActivity({ action: "delete", entity: "rider_photo", entityId: parsed.data.id, detail: {} });
  return NextResponse.json({ ok: true });
}
