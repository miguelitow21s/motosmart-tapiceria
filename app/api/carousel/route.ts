import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { assertCsrf } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { invalidPayload, internalError } from "@/lib/api-response";

const carouselUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).max(12)
});

export async function GET() {
  // Endpoint publico: cliente anon sujeto a RLS, nunca service_role.
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("images")
    .select("id,storage_path,alt_text,created_at,designs(name,short_description),brands(name)")
    .eq("is_weekly_highlight", true)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) return internalError("carousel GET", error);

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
  if (!parsed.success) return invalidPayload(parsed.error);

  const supabase = createAdminSupabaseClient();

  // Antes eran dos UPDATE HTTP independientes (limpiar todo -> marcar los
  // nuevos): si el segundo fallaba, el carrusel publico quedaba vacio sin
  // que quedara claro que la operacion se hizo a medias. Ahora es una sola
  // funcion SQL con las dos escrituras en la misma transaccion (ver
  // migracion 011: public.set_weekly_highlights).
  const { error } = await supabase.rpc("set_weekly_highlights", { p_ids: parsed.data.ids });
  if (error) return internalError("carousel POST", error);

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

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("set_weekly_highlights", { p_ids: [] });
  if (error) return internalError("carousel DELETE", error);

  await logAdminActivity({
    action: "clear",
    entity: "carousel",
    detail: {}
  });

  return NextResponse.json({ ok: true });
}
