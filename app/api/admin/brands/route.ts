import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertCsrf, sanitizeText } from "@/lib/security";

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

export async function GET() {
  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("brands").select("*").order("created_at", { ascending: false });
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

  const parsed = brandSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const payload = {
    name: sanitizeText(parsed.data.name),
    slug: parsed.data.slug,
    description: sanitizeText(parsed.data.description),
    logo_url: parsed.data.logo_url ?? null,
    is_active: parsed.data.is_active
  };

  const { error } = await supabase.from("brands").insert(payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();

  const { count, error: countError } = await supabase
    .from("designs")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", parsed.data.id);

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar la marca porque tiene diseños asociados" },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("brands").delete().eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    action: "delete",
    entity: "brand",
    entityId: parsed.data.id,
    detail: { hardDelete: true }
  });

  return NextResponse.json({ ok: true });
}
