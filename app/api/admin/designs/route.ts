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
  is_active: z.boolean().default(true)
});

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
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const payload = {
    ...parsed.data,
    name: sanitizeText(parsed.data.name),
    short_description: sanitizeText(parsed.data.short_description)
  };
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

  const parsed = designSchema.extend({ id: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { id, ...rest } = parsed.data;
  const { error } = await supabase
    .from("designs")
    .update({
      ...rest,
      name: sanitizeText(rest.name),
      short_description: sanitizeText(rest.short_description),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminActivity({
    action: "update",
    entity: "design",
    entityId: id,
    detail: { slug: rest.slug, is_active: rest.is_active }
  });
  return NextResponse.json({ ok: true });
}
