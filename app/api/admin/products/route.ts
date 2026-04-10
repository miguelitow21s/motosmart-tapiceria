import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertCsrf } from "@/lib/security";

const createProductSchema = z.object({
  design_id: z.string().uuid(),
  sku: z.string().min(2).max(80),
  stock: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true)
});

const patchProductSchema = z.object({
  id: z.string().uuid(),
  design_id: z.string().uuid().optional(),
  sku: z.string().min(2).max(80).optional(),
  stock: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional()
}).superRefine((value, ctx) => {
  if (
    value.design_id === undefined &&
    value.sku === undefined &&
    value.stock === undefined &&
    value.is_active === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["id"],
      message: "No fields to update"
    });
  }
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

function sanitizeSku(value: string) {
  return value.trim().toUpperCase();
}

export async function GET() {
  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,design_id,sku,is_active,stock,designs(name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = patchProductSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const payload: {
    design_id?: string;
    sku?: string;
    stock?: number;
    is_active?: boolean;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };

  if (parsed.data.design_id !== undefined) payload.design_id = parsed.data.design_id;
  if (parsed.data.sku !== undefined) payload.sku = sanitizeSku(parsed.data.sku);
  if (parsed.data.stock !== undefined) payload.stock = parsed.data.stock;
  if (parsed.data.is_active !== undefined) payload.is_active = parsed.data.is_active;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    action: "update",
    entity: "product",
    entityId: parsed.data.id,
    detail: payload
  });

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createProductSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const payload = {
    design_id: parsed.data.design_id,
    sku: sanitizeSku(parsed.data.sku),
    stock: parsed.data.stock,
    is_active: parsed.data.is_active
  };

  const { error } = await supabase.from("products").insert(payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    action: "create",
    entity: "product",
    detail: payload
  });

  return NextResponse.json({ ok: true }, { status: 201 });
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("products").delete().eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    action: "delete",
    entity: "product",
    entityId: parsed.data.id,
    detail: { hardDelete: true }
  });

  return NextResponse.json({ ok: true });
}
