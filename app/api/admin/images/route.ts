import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { assertCsrf, sanitizeText } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { invalidPayload, internalError } from "@/lib/api-response";

const imageUpdateSchema = z.object({
  id: z.string().uuid(),
  alt_text: z.string().max(180).optional(),
  is_weekly_highlight: z.boolean().optional(),
  brand_id: z.string().uuid().nullable().optional(),
  design_id: z.string().uuid().nullable().optional()
});

const imageDeleteSchema = z.object({
  id: z.string().uuid()
});

const imageUploadFieldsSchema = z.object({
  brand_id: z.string().uuid().nullable(),
  design_id: z.string().uuid().nullable(),
  alt_text: z.string().max(180).optional().default(""),
  is_weekly_highlight: z.coerce.boolean().optional().default(false)
});

// Allowlist explicita: nunca confiar en file.type (lo controla el cliente) ni
// en file.name para el nombre final del objeto en Storage.
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif"
};
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

async function createAdminClient() {
  return createAdminSupabaseClient();
}

function getStoragePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/catalog/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function GET() {
  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from("images")
    .select("id,storage_path,alt_text,is_weekly_highlight,brand_id,design_id,created_at,brands(name),designs(name)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return internalError("images GET", error);
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
  if (!ext) {
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Maximo 8 MB por imagen" }, { status: 413 });
  }

  const rawBrandId = formData.get("brand_id");
  const rawDesignId = formData.get("design_id");
  const parsedFields = imageUploadFieldsSchema.safeParse({
    brand_id: rawBrandId ? String(rawBrandId) : null,
    design_id: rawDesignId ? String(rawDesignId) : null,
    alt_text: String(formData.get("alt_text") ?? ""),
    is_weekly_highlight: String(formData.get("is_weekly_highlight") ?? "false")
  });
  if (!parsedFields.success) return invalidPayload(parsedFields.error);

  const altText = sanitizeText(parsedFields.data.alt_text);

  const adminClient = await createAdminClient();

  // Nombre generado por el servidor: nunca file.name. Evita colisiones,
  // sobrescrituras (upsert:false) y segmentos como "../" en la ruta.
  const path = `catalog/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await adminClient.storage.from("catalog").upload(path, file, {
    upsert: false,
    contentType: file.type
  });

  if (uploadError) return internalError("images POST upload", uploadError);

  const { data: pub } = adminClient.storage.from("catalog").getPublicUrl(path);

  const { error: insertError } = await adminClient.from("images").insert({
    brand_id: parsedFields.data.brand_id,
    design_id: parsedFields.data.design_id,
    storage_path: pub.publicUrl,
    alt_text: altText,
    is_weekly_highlight: parsedFields.data.is_weekly_highlight,
    created_by: user?.id ?? null
  });

  if (insertError) return internalError("images POST insert", insertError);
  await logAdminActivity({
    action: "upload",
    entity: "image",
    detail: { path, designId: parsedFields.data.design_id, brandId: parsedFields.data.brand_id, isWeeklyHighlight: parsedFields.data.is_weekly_highlight }
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

  const parsed = imageUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  const adminClient = await createAdminClient();
  const payload: {
    alt_text?: string;
    is_weekly_highlight?: boolean;
    brand_id?: string | null;
    design_id?: string | null;
  } = {};

  if (parsed.data.alt_text !== undefined) payload.alt_text = sanitizeText(parsed.data.alt_text);
  if (parsed.data.is_weekly_highlight !== undefined) payload.is_weekly_highlight = parsed.data.is_weekly_highlight;
  if (parsed.data.brand_id !== undefined) payload.brand_id = parsed.data.brand_id;
  if (parsed.data.design_id !== undefined) payload.design_id = parsed.data.design_id;

  const { error } = await adminClient.from("images").update(payload).eq("id", parsed.data.id);
  if (error) return internalError("images PATCH", error);

  await logAdminActivity({
    action: "update",
    entity: "image",
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

  const parsed = imageDeleteSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  const adminClient = await createAdminClient();

  // La ruta de Storage a borrar sale de la fila que se esta borrando, nunca
  // del cuerpo de la peticion: si el cliente la omite u omite mal, antes se
  // perdia la unica referencia al archivo real y quedaba huerfano para
  // siempre. select() sobre el propio delete la recupera de forma atomica.
  const { data: deleted, error: deleteDbError } = await adminClient
    .from("images")
    .delete()
    .eq("id", parsed.data.id)
    .select("storage_path");
  if (deleteDbError) return internalError("images DELETE db", deleteDbError);

  const url = deleted?.[0]?.storage_path;
  const storagePath = url ? getStoragePathFromPublicUrl(url) : null;
  if (storagePath) {
    const { error: rmError } = await adminClient.storage.from("catalog").remove([storagePath]);
    if (rmError) console.error("images DELETE storage (huerfano):", storagePath, rmError.message);
  }

  await logAdminActivity({
    action: "delete",
    entity: "image",
    entityId: parsed.data.id,
    detail: { storagePath }
  });

  return NextResponse.json({ ok: true });
}
