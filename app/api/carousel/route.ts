import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { logAdminActivity } from "@/lib/admin-activity";
import { assertCsrf } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { invalidPayload, internalError } from "@/lib/api-response";
import { getCarouselSlides } from "@/features/catalog/services/catalog.service";

const carouselUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).max(12)
});

export async function GET() {
  // Endpoint público: cliente anon sujeto a RLS, nunca service_role. Misma
  // lectura que usa la portada en el servidor (getCarouselSlides).
  const slides = await getCarouselSlides();
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
