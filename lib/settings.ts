import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Textos y configuracion editables desde /admin > "Textos y Config".
 *
 * Estas claves viven en public.settings con is_public = true (migraciones 009 y
 * 010). Cambiarlas en el panel cambia la web sin desplegar nada.
 *
 * Para anadir una clave nueva: sembrarla en una migracion con is_public = true
 * y anadirla aqui y en SETTINGS_KEYS del panel.
 */
export type SiteSettings = {
  business_name: string;
  hero_tagline: string;
  hero_description: string;
  hero_cta_text: string;
  about_description: string;
  whatsapp_number: string;
  whatsapp_default_message: string;
  meta_title: string;
  meta_description: string;
};

/**
 * Valores de respaldo, identicos a los sembrados en la migracion 010.
 * Solo se usan si la consulta falla: la web nunca debe quedarse en blanco
 * porque la base de datos tenga un mal momento.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  business_name: "MotoSmart Tapiceria",
  hero_tagline: "Tapiceria de moto premium a tu medida",
  hero_description:
    "Asientos hechos a mano, materiales de alto agarre y terminados con detalle profesional para que tu moto se vea y se sienta mejor.",
  hero_cta_text: "Ver catalogo",
  about_description:
    "Somos un equipo enfocado en tapiceria premium para motos. Combinamos materiales de alto rendimiento, procesos tecnicos y diseno contemporaneo para crear productos duraderos y unicos.",
  whatsapp_number: "573146943434",
  whatsapp_default_message: "Hola MotoSmart, quiero informacion.",
  meta_title: "MotoSmart Tapiceria | Tapiceria premium en Medellin",
  meta_description:
    "Tapiceria premium para motos en Medellin. Asientos a medida, materiales de alto agarre y acabados profesionales. Cotiza por WhatsApp."
};

function readText(value: unknown): string | null {
  if (value && typeof value === "object" && "text" in value) {
    const text = (value as { text?: unknown }).text;
    if (typeof text === "string" && text.trim().length > 0) return text;
  }
  return null;
}

/**
 * cache() de React deduplica la consulta dentro de un mismo render: el layout
 * y la pagina piden los settings y solo se hace un viaje a Supabase.
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
    const key = (row as { key?: string }).key;
    if (!key || !(key in result)) continue;
    const text = readText((row as { value?: unknown }).value);
    if (text) result[key as keyof SiteSettings] = text;
  }
  return result;
});

/** Enlace de WhatsApp ya armado, para no repetir la plantilla en cada sitio. */
export function buildWhatsAppUrl(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
