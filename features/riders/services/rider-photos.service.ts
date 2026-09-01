import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RiderPhoto } from "@/types";

export async function getRiderPhotos(): Promise<RiderPhoto[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("rider_photos")
    .select("id,storage_path,rider_name,moto_info,is_active,display_order,created_at")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getRiderPhotos", error.message);
    return [];
  }
  return data ?? [];
}
