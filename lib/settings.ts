import { cache } from "react";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { DEFAULT_SETTINGS, OPTIONAL_SETTING_KEYS, type SiteSettings } from "@/lib/settings-defaults";

export {
  buildWhatsAppUrl,
  DEFAULT_SETTINGS,
  instagramHandle,
  OPTIONAL_SETTING_KEYS,
  PUBLIC_SETTING_KEYS,
  type SiteSettings
} from "@/lib/settings-defaults";

type SettingRow = { key: string; value: unknown };

/**
 * Todas las claves públicas de la tabla settings en un solo viaje por render:
 * los textos (getSiteSettings) y el orden del carrusel (getCarouselOrderValue)
 * salen de aquí. Antes la portada consultaba la tabla dos veces.
 * `null` si la consulta falló: cada lector decide su respaldo.
 */
const getSettingRows = cache(async (): Promise<SettingRow[] | null> => {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("settings").select("key,value");

  if (error) {
    console.error("getSettingRows", error.message);
    return null;
  }
  return (data ?? []) as SettingRow[];
});

function readText(value: unknown): string | null {
  if (value && typeof value === "object" && "text" in value) {
    const text = (value as { text?: unknown }).text;
    if (typeof text === "string") return text.trim();
  }
  return null;
}

/**
 * Textos editables desde el panel, con los de fábrica como respaldo. cache()
 * de React deduplica dentro de un mismo render: el layout, la metadata y la
 * página los piden y solo se hace un viaje a Supabase.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await getSettingRows();
  if (!rows) return DEFAULT_SETTINGS;

  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    const key = row.key as keyof SiteSettings | undefined;
    if (!key || !(key in result)) continue;
    const text = readText(row.value);
    if (text === null) continue;
    if (text.length > 0 || OPTIONAL_SETTING_KEYS.has(key)) result[key] = text;
  }
  return result;
});

/** Valor crudo de settings.carousel_order (lo interpreta lib/carousel-order). */
export async function getCarouselOrderValue(): Promise<unknown> {
  const rows = await getSettingRows();
  return rows?.find((row) => row.key === "carousel_order")?.value ?? null;
}
