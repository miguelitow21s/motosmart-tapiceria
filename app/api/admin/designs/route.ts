import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertCsrf, sanitizeText } from "@/lib/security";

const designSchema = z.object({
  id: z.string().uuid().optional(),
  brand_id: z.string().uuid(),
  name: z.string().min(2).max(60),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  short_description: z.string().max(180).default(""),
  image_url: z.string().url(),
  base_price: z.number().int().nonnegative(),
  discount_price: z.number().positive().nullable().optional(),
  promotion_label: z.string().max(60).default(""),
  promotion_active: z.boolean().default(false),
  promotion_starts_at: z.string().datetime().nullable().optional(),
  promotion_ends_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().default(true)
}).superRefine((value, ctx) => {
  if (!value.promotion_active) return;

  if (typeof value.discount_price !== "number") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discount_price"],
      message: "Debes definir precio de descuento cuando la promocion esta activa"
    });
    return;
  }

  if (value.discount_price >= value.base_price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discount_price"],
      message: "El descuento debe ser menor al precio base"
    });
  }

  if (value.promotion_label.trim().length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["promotion_label"],
      message: "La etiqueta de promocion debe tener al menos 3 caracteres"
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
});

function normalizePromotionPayload(payload: z.infer<typeof designSchema>) {
  const active = payload.promotion_active;

  return {
    ...payload,
    name: sanitizeText(payload.name),
    short_description: sanitizeText(payload.short_description),
    promotion_label: active ? sanitizeText(payload.promotion_label) : "",
    discount_price: active ? payload.discount_price ?? null : null,
    promotion_starts_at: active ? payload.promotion_starts_at ?? null : null,
    promotion_ends_at: active ? payload.promotion_ends_at ?? null : null
  };
}

export async function GET() {
  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("designs")
    .select("*, brands(name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        detail: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const payload = normalizePromotionPayload(parsed.data);
  const { error } = await supabase.from("designs").insert(payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminActivity({
    action: "create",
    entity: "design",
    detail: { slug: payload.slug, brand_id: payload.brand_id }
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

  const payload = await request.json();
  const parsedId = z.object({ id: z.string().uuid() }).safeParse(payload);
  if (!parsedId.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        detail: parsedId.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  const parsed = designSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        detail: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
