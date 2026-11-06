import { cache } from "react";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { RiderPhoto } from "@/types";

/** cache(): la metadata y la página piden las mismas fotos en un solo viaje. */
export const getRiderPhotos = cache(async (): Promise<RiderPhoto[]> => {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("rider_photos")
    .select("id,storage_path,rider_name,moto_info,is_active,display_order,created_at")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  // Un error de la base no es "no hay fotos": lo atrapa app/error.tsx.
  if (error) throw new Error(`getRiderPhotos: ${error.message}`);
  return data ?? [];
});
