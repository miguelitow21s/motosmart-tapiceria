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
  design_id: z.string().uuid().nullable().optional(),
  // Convierte esta foto en la foto principal (designs.image_url) del diseño
  // al que queda vinculada: vincular a secas solo organiza la galeria.
  set_as_design_image: z.boolean().optional()
});

const imageDeleteSchema = z.object({
  id: z.string().uuid()
});

// FormData solo transporta texto. Antes era z.coerce.boolean(), que hace
// Boolean("false") === true: TODA foto subida (disenos, logos, galeria)
// quedaba marcada como destacada y aparecia en el carrusel publico, y al
// llegar a 8 el carrusel ya no aceptaba fotos nuevas.
const formBoolean = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

const imageUploadFieldsSchema = z
  .object({
    brand_id: z.string().uuid().nullable(),
    design_id: z.string().uuid().nullable(),
    alt_text: z.string().max(180, "El texto de la foto admite maximo 180 caracteres").optional().default(""),
    is_weekly_highlight: formBoolean,
    set_as_design_image: formBoolean
  })
  .refine((value) => !value.set_as_design_image || value.design_id, {
    path: ["design_id"],
    message: "Elige el diseño del que esta foto sera la foto principal"
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

// Una foto puede ser a la vez una fila de la galeria y la foto principal de un
// diseño o el logo de una marca (se guarda la URL, no una FK). Borrarla desde
// la galeria o el carrusel dejaba esa silla/marca con la foto rota en la web.
async function describeImageUsage(adminClient: ReturnType<typeof createAdminSupabaseClient>, url: string) {
  const [{ data: design, error: designError }, { data: brand, error: brandError }] = await Promise.all([
    adminClient.from("designs").select("name").eq("image_url", url).limit(1).maybeSingle(),
    adminClient.from("brands").select("name").eq("logo_url", url).limit(1).maybeSingle()
  ]);
  // Falla cerrado: si no se puede comprobar, no se borra.
  if (designError || brandError) throw designError ?? brandError;
  if (design) return `la foto principal del diseño «${design.name}»`;
  if (brand) return `el logo de la marca «${brand.name}»`;
  return null;
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
    return NextResponse.json({ error: "Formato de foto no permitido. Usa JPG, PNG, WEBP o AVIF." }, { status: 415 });
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
    is_weekly_highlight: String(formData.get("is_weekly_highlight") ?? "false"),
    set_as_design_image: String(formData.get("set_as_design_image") ?? "false")
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

  const { data: inserted, error: insertError } = await adminClient
    .from("images")
    .insert({
      brand_id: parsedFields.data.brand_id,
      design_id: parsedFields.data.design_id,
      storage_path: pub.publicUrl,
      alt_text: altText,
      is_weekly_highlight: parsedFields.data.is_weekly_highlight,
      created_by: user?.id ?? null
    })
    .select("id")
    .single();

  if (insertError) return internalError("images POST insert", insertError);

  if (parsedFields.data.set_as_design_image && parsedFields.data.design_id) {
    const { error: designError } = await adminClient
      .from("designs")
      .update({ image_url: pub.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", parsedFields.data.design_id);
    if (designError) {
      console.error("images POST set_as_design_image", designError.message);
      return NextResponse.json(
        { error: "La foto se subio a la galeria, pero no se pudo poner como foto principal del diseño" },
        { status: 500 }
      );
    }
  }

  await logAdminActivity({
    action: "upload",
    entity: "image",
    entityId: inserted.id,
    detail: {
      path,
      designId: parsedFields.data.design_id,
      brandId: parsedFields.data.brand_id,
      isWeeklyHighlight: parsedFields.data.is_weekly_highlight,
      setAsDesignImage: parsedFields.data.set_as_design_image
    }
  });
  return NextResponse.json({ ok: true, id: inserted.id, url: pub.publicUrl }, { status: 201 });
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

  // update() con cuerpo vacio no es valido en PostgREST: si solo se pide
  // set_as_design_image, basta con leer la fila.
  const { data: image, error } =
    Object.keys(payload).length > 0
      ? await adminClient.from("images").update(payload).eq("id", parsed.data.id).select("storage_path,design_id").maybeSingle()
      : await adminClient.from("images").select("storage_path,design_id").eq("id", parsed.data.id).maybeSingle();
  if (error) return internalError("images PATCH", error);
  if (!image) return NextResponse.json({ error: "La foto ya no existe" }, { status: 404 });

  if (parsed.data.set_as_design_image) {
    if (!image.design_id) {
      return NextResponse.json({ error: "Vincula la foto a un diseño antes de usarla como foto principal" }, { status: 400 });
    }
    const { error: designError } = await adminClient
      .from("designs")
      .update({ image_url: image.storage_path, updated_at: new Date().toISOString() })
      .eq("id", image.design_id);
    if (designError) return internalError("images PATCH set_as_design_image", designError);
  }

  await logAdminActivity({
    action: "update",
    entity: "image",
    entityId: parsed.data.id,
    detail: { ...payload, setAsDesignImage: parsed.data.set_as_design_image ?? false }
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

  const { data: current, error: readError } = await adminClient
    .from("images")
    .select("storage_path")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError) return internalError("images DELETE read", readError);
  if (current) {
    let usage: string | null;
    try {
      usage = await describeImageUsage(adminClient, current.storage_path);
    } catch (usageError) {
      return internalError("images DELETE usage", usageError);
    }
    if (usage) {
      return NextResponse.json(
        { error: `No se puede borrar: esta foto es ${usage}. Cambia esa foto primero y luego bórrala.` },
        { status: 409 }
      );
    }
  }

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
