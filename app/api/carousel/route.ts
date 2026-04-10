import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { assertCsrf } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const carouselUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).max(12)
});

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("images")
    .select("id,storage_path,alt_text,created_at,designs(name,short_description),brands(name)")
    .eq("is_weekly_highlight", true)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const slides = (data ?? []).map((item) => {
    const design = Array.isArray(item.designs) ? item.designs[0] : item.designs;
    const brand = Array.isArray(item.brands) ? item.brands[0] : item.brands;
    const title = design?.name || item.alt_text || "Trabajo reciente";
    const description =
      design?.short_description ||
      (brand?.name ? `Tapiceria para ${brand.name}` : "Acabado premium para tu moto.");

    return {
      id: item.id,
      title,
      description,
      image: item.storage_path,
      alt: item.alt_text || title
    };
  });

  return NextResponse.json({ data: slides });
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const { role } = await getCurrentUserRole();
  if (!canAccessAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = carouselUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();

  const { error: clearError } = await supabase
    .from("images")
    .update({ is_weekly_highlight: false })
    .eq("is_weekly_highlight", true);
  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });

  if (parsed.data.ids.length > 0) {
    const { error: setError } = await supabase
      .from("images")
      .update({ is_weekly_highlight: true })
      .in("id", parsed.data.ids);
    if (setError) return NextResponse.json({ error: setError.message }, { status: 500 });
  }

  await logAdminActivity({
    action: "update",
    entity: "carousel",
    detail: { ids: parsed.data.ids }
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

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("images")
    .update({ is_weekly_highlight: false })
    .eq("is_weekly_highlight", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    action: "clear",
    entity: "carousel",
    detail: {}
  });

  return NextResponse.json({ ok: true });
}
