import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Brand, Design } from "@/types";

export async function getBrands(): Promise<Brand[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id,name,slug,description,logo_url,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    console.error("getBrands", error.message);
    return [];
  }
  return data ?? [];
}

// Home: un diseño real por marca activa (con precio y botón de WhatsApp),
// para que el visitante vea el catálogo real de un vistazo en vez de solo
// fotos genéricas. PostgREST no tiene "un registro por grupo" en el cliente
// JS, así que se trae todo lo activo y se agrupa en memoria: a esta escala
// (marcas x diseños de un taller) es trivial en costo.
export async function getFeaturedDesigns(limit = 8): Promise<Design[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("designs")
    .select(
      "id,brand_id,name,slug,short_description,image_url,is_active,base_price,discount_price,promotion_label,promotion_active,promotion_starts_at,promotion_ends_at,brands!inner(is_active)"
    )
    .eq("is_active", true)
    .eq("brands.is_active", true)
    .order("brand_id", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("getFeaturedDesigns", error.message);
    return [];
  }

  const seenBrands = new Set<string>();
  const featured: Design[] = [];
  for (const row of (data ?? []) as Design[]) {
    if (seenBrands.has(row.brand_id)) continue;
    seenBrands.add(row.brand_id);
    featured.push(row);
    if (featured.length >= limit) break;
  }
  return featured;
}

export interface BrandDesigns {
  brand: Pick<Brand, "id" | "name"> | null;
  designs: Design[];
}

export async function getDesignsByBrandSlug(slug: string): Promise<BrandDesigns> {
  const supabase = await createServerSupabaseClient();
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id,name")
    .eq("slug", slug)
    .single();
  if (brandError) {
    console.error("getDesigns brand", brandError.message);
    return { brand: null, designs: [] };
  }
  if (!brand) return { brand: null, designs: [] };

  const { data, error } = await supabase
    .from("designs")
    .select(
      "id,brand_id,name,slug,short_description,image_url,is_active,base_price,discount_price,promotion_label,promotion_active,promotion_starts_at,promotion_ends_at"
    )
    .eq("brand_id", brand.id)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    console.error("getDesigns designs", error.message);
    return { brand, designs: [] };
  }
  return { brand, designs: data ?? [] };
}
