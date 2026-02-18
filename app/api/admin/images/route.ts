import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { assertCsrf, sanitizeText } from "@/lib/security";

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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }

  const brandId = formData.get("brand_id");
  const designId = formData.get("design_id");
  const altText = sanitizeText(String(formData.get("alt_text") ?? ""));
  const isWeeklyHighlight = String(formData.get("is_weekly_highlight") ?? "false") === "true";

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

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
