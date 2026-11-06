import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, OPTIONAL_SETTING_KEYS, type SiteSettings } from "@/lib/settings-defaults";

export {
  buildWhatsAppUrl,
  DEFAULT_SETTINGS,
  instagramHandle,
  OPTIONAL_SETTING_KEYS,
  PUBLIC_SETTING_KEYS,
  type SiteSettings
} from "@/lib/settings-defaults";

function readText(value: unknown): string | null {
  if (value && typeof value === "object" && "text" in value) {
    const text = (value as { text?: unknown }).text;
    if (typeof text === "string") return text.trim();
  }
  return null;
}

/**
 * cache() de React deduplica la consulta dentro de un mismo render: el layout
 * y la página piden los settings y solo se hace un viaje a Supabase.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("settings").select("key,value");

  if (error) {
    console.error("getSiteSettings", error.message);
    return DEFAULT_SETTINGS;
  }

  const result = { ...DEFAULT_SETTINGS };
  for (const row of data ?? []) {
    const key = (row as { key?: string }).key as keyof SiteSettings | undefined;
    if (!key || !(key in result)) continue;
    const text = readText((row as { value?: unknown }).value);
    if (text === null) continue;
    if (text.length > 0 || OPTIONAL_SETTING_KEYS.has(key)) result[key] = text;
  }
  return result;
});
