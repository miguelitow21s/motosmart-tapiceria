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

export async function getDesignsByBrandSlug(slug: string): Promise<Design[]> {
  const supabase = await createServerSupabaseClient();
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .single();
  if (brandError) {
    console.error("getDesigns brand", brandError.message);
    return [];
  }
  if (!brand) return [];

  const { data, error } = await supabase
    .from("designs")
    .select(
      "id,brand_id,name,slug,short_description,image_url,is_active,base_price"
    )
    .eq("brand_id", brand.id)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    console.error("getDesigns designs", error.message);
    return [];
  }
  return data ?? [];
}
