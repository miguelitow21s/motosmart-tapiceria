import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { assertCsrf, sanitizeText } from "@/lib/security";

const imageUpdateSchema = z.object({
  id: z.string().uuid(),
  alt_text: z.string().max(180).optional(),
  is_weekly_highlight: z.boolean().optional(),
  brand_id: z.string().uuid().nullable().optional(),
  design_id: z.string().uuid().nullable().optional()
});

const imageDeleteSchema = z.object({
  id: z.string().uuid(),
  storage_path: z.string().url().optional()
});

async function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
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

  try {
    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from("images")
      .select("id,storage_path,alt_text,is_weekly_highlight,brand_id,design_id,created_at,brands(name),designs(name)")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
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

  const brandId = formData.get("brand_id");
  const designId = formData.get("design_id");
  const altText = sanitizeText(String(formData.get("alt_text") ?? ""));
  const isWeeklyHighlight = String(formData.get("is_weekly_highlight") ?? "false") === "true";

  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  const path = `catalog/${Date.now()}-${file.name.replace(/\s+/g, "-").toLowerCase()}`;
  const { error: uploadError } = await adminClient.storage.from("catalog").upload(path, file, {
    upsert: true,
    contentType: file.type
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: pub } = adminClient.storage.from("catalog").getPublicUrl(path);

  const { error: insertError } = await adminClient.from("images").insert({
    brand_id: brandId ? String(brandId) : null,
    design_id: designId ? String(designId) : null,
    storage_path: pub.publicUrl,
    alt_text: altText,
    is_weekly_highlight: isWeeklyHighlight,
    created_by: user?.id ?? null
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  await logAdminActivity({
    action: "upload",
    entity: "image",
    detail: { path, designId, brandId, isWeeklyHighlight }
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAdminActivity({
      action: "update",
      entity: "image",
      entityId: parsed.data.id,
      detail: payload
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const adminClient = await createAdminClient();

    const { error: deleteDbError } = await adminClient.from("images").delete().eq("id", parsed.data.id);
    if (deleteDbError) return NextResponse.json({ error: deleteDbError.message }, { status: 500 });

    const storagePath = parsed.data.storage_path ? getStoragePathFromPublicUrl(parsed.data.storage_path) : null;
    if (storagePath) {
      await adminClient.storage.from("catalog").remove([storagePath]);
    }

    await logAdminActivity({
      action: "delete",
      entity: "image",
      entityId: parsed.data.id,
      detail: { storagePath }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
