import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { assertCsrf, sanitizeText } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { invalidPayload, internalError } from "@/lib/api-response";

// Postgres/PostgREST devuelve timestamptz como "2026-09-29T20:00:00+00:00".
// z.string().datetime() sin offset solo acepta "...Z", asi que cualquier
// edicion rapida (precio, descripcion, activo, promo) de un diseño que ya
// tuviera fechas de promocion se rechazaba con "Invalid payload".
const isoDateTime = z.string().datetime({ offset: true, message: "Fecha de promocion invalida" });

const designSchema = z.object({
  id: z.string().uuid().optional(),
  brand_id: z.string({ required_error: "Elige una marca" }).uuid("Elige una marca"),
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(60, "El nombre admite maximo 60 caracteres"),
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(60, "El slug admite maximo 60 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede tener minusculas, numeros y guiones"),
  short_description: z.string().max(180, "La descripcion corta admite maximo 180 caracteres").default(""),
  image_url: z.string({ required_error: "Sube una foto principal" }).url("Sube una foto principal o pega una URL valida"),
  base_price: z
    .number({ invalid_type_error: "Escribe el precio base" })
    .int("El precio base debe ser en pesos enteros, sin decimales")
    .nonnegative("El precio base no puede ser negativo"),
  discount_price: z
    .number({ invalid_type_error: "Escribe el precio de rebaja" })
    .int("El precio de rebaja debe ser en pesos enteros, sin decimales")
    .positive("El precio de rebaja debe ser mayor que 0")
    .nullable()
    .optional(),
  promotion_label: z.string().max(60, "La etiqueta de promocion admite maximo 60 caracteres").default(""),
  promotion_active: z.boolean().default(false),
  promotion_starts_at: isoDateTime.nullable().optional(),
  promotion_ends_at: isoDateTime.nullable().optional(),
  is_active: z.boolean().default(true)
}).superRefine((value, ctx) => {
  // Aplica con la promo encendida o apagada: la rebaja se conserva aunque la
  // promo este apagada (ver normalizePromotionPayload) y la BD la exige menor
  // al precio base siempre (designs_discount_lt_base_check).
  if (typeof value.discount_price === "number" && value.discount_price >= value.base_price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discount_price"],
      message: "El precio de rebaja debe ser menor al precio base"
    });
  }

  if (value.promotion_starts_at && value.promotion_ends_at) {
    const start = new Date(value.promotion_starts_at);
    const end = new Date(value.promotion_ends_at);
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promotion_ends_at"],
        message: "La fecha fin debe ser posterior a la fecha de inicio"
      });
    }
  }

  if (!value.promotion_active) return;

  if (typeof value.discount_price !== "number") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discount_price"],
      message: "Debes definir precio de descuento cuando la promocion esta activa"
    });
  }

  if (value.promotion_label.trim().length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["promotion_label"],
      message: "La etiqueta de promocion debe tener al menos 3 caracteres"
    });
  }
});

// Antes, con la promo apagada se borraban en silencio la rebaja, la etiqueta
// y las fechas: la administradora escribia la rebaja, guardaba, y al activar
// la promo despues ya no existia. Ahora se conservan; la web publica solo las
// muestra cuando la promo esta activa y dentro de fechas (getPromotionMeta).
function normalizePromotionPayload(payload: z.infer<typeof designSchema>) {
  return {
    ...payload,
    name: sanitizeText(payload.name),
    short_description: sanitizeText(payload.short_description),
    promotion_label: sanitizeText(payload.promotion_label),
    discount_price: payload.discount_price ?? null,
    promotion_starts_at: payload.promotion_starts_at ?? null,
    promotion_ends_at: payload.promotion_ends_at ?? null
  };
}

const DUPLICATE_DESIGN_MESSAGE = "Ya existe un diseño con ese nombre (slug) en esta marca. Usa otro nombre.";

// La foto se sube antes de guardar el diseño (al crear uno nuevo aun no hay
// id), asi que la fila de la galeria queda "Sin vincular". Al guardar se
// vincula la foto que quedo como principal.
async function linkMainImage(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  designId: string,
  brandId: string,
  imageUrl: string
) {
  const { error } = await supabase
    .from("images")
    .update({ design_id: designId, brand_id: brandId })
    .eq("storage_path", imageUrl)
    .is("design_id", null);
  if (error) console.error("designs linkMainImage", error.message);
}

const deleteDesignSchema = z.object({
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
    .from("designs")
    .select(
      "id,brand_id,name,slug,short_description,image_url,base_price,discount_price,promotion_label,promotion_active,promotion_starts_at,promotion_ends_at,is_active,created_at,brands(name)"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return internalError("designs GET", error);
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

  const parsed = designSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  const supabase = createAdminSupabaseClient();
  const payload = normalizePromotionPayload(parsed.data);
  const { data: created, error } = await supabase.from("designs").insert(payload).select("id").single();
  if (error?.code === "23505") return NextResponse.json({ error: DUPLICATE_DESIGN_MESSAGE }, { status: 409 });
  if (error) return internalError("designs POST", error);
  await linkMainImage(supabase, created.id, payload.brand_id, payload.image_url);
  await logAdminActivity({
    action: "create",
    entity: "design",
    entityId: created.id,
    detail: { slug: payload.slug, brand_id: payload.brand_id }
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

  const payload = await request.json();
  const parsedId = z.object({ id: z.string().uuid() }).safeParse(payload);
  if (!parsedId.success) return invalidPayload(parsedId.error);

  const parsed = designSchema.safeParse(payload);
  if (!parsed.success) return invalidPayload(parsed.error);

  const supabase = createAdminSupabaseClient();
  const id = parsedId.data.id;
  const { id: _ignoredId, ...rest } = parsed.data;
  const normalized = normalizePromotionPayload(rest);
  const { error } = await supabase
    .from("designs")
    .update({
      ...normalized,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error?.code === "23505") return NextResponse.json({ error: DUPLICATE_DESIGN_MESSAGE }, { status: 409 });
  if (error) return internalError("designs PATCH", error);
  await linkMainImage(supabase, id, normalized.brand_id, normalized.image_url);
  await logAdminActivity({
    action: "update",
    entity: "design",
    entityId: id,
    detail: {
      slug: normalized.slug,
      is_active: normalized.is_active,
      promotion_active: normalized.promotion_active,
      discount_price: normalized.discount_price
    }
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

  const parsed = deleteDesignSchema.safeParse(await request.json());
  if (!parsed.success) return invalidPayload(parsed.error);

  const supabase = createAdminSupabaseClient();

  // Las fotos de este diseño se borran en cascada en la base de datos
  // (images.design_id on delete cascade), pero eso no toca Storage: sin
  // recoger las rutas antes, el archivo real queda huerfano para siempre.
  const { data: relatedImages } = await supabase
    .from("images")
    .select("storage_path")
    .eq("design_id", parsed.data.id);

  const { error } = await supabase.from("designs").delete().eq("id", parsed.data.id);
  if (error) return internalError("designs DELETE", error);

  const paths = (relatedImages ?? [])
    .map((img) => getStoragePathFromPublicUrl(img.storage_path))
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    const { error: rmError } = await supabase.storage.from("catalog").remove(paths);
    if (rmError) console.error("designs DELETE storage (huerfanos):", paths, rmError.message);
  }

  await logAdminActivity({
    action: "delete",
    entity: "design",
    entityId: parsed.data.id,
    detail: { hardDelete: true, removedImages: paths.length }
  });

  return NextResponse.json({ ok: true });
}
