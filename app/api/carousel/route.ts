import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
