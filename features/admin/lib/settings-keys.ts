import { OPTIONAL_SETTING_KEYS, type SiteSettings } from "@/lib/settings-defaults";
import { isWebUrl } from "@/lib/url";

/*
  Textos que la administradora edita en "Textos". Agrupados por la parte de
  la tienda donde aparecen, con nombres de la tienda (no de la base de datos).
  Para añadir uno nuevo, ver lib/settings-defaults.ts.
*/

export type SettingKind = "text" | "textarea" | "tel" | "url";

export type SettingField = {
  key: keyof SiteSettings;
  label: string;
  hint?: string;
  kind: SettingKind;
  min?: number;
  max: number;
};

export type SettingGroup = { id: string; title: string; description: string; fields: SettingField[] };

const EMPTY_HIDES = "Si lo dejas vacío, no se muestra.";

export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: "portada",
    title: "Portada",
    description: "Lo primero que se ve al abrir la tienda.",
    fields: [
      { key: "business_name", label: "Nombre del negocio", kind: "text", min: 2, max: 120 },
      { key: "hero_tagline", label: "Título de la portada", kind: "text", min: 2, max: 180 },
      { key: "hero_description", label: "Texto bajo el título", kind: "textarea", min: 10, max: 500 },
      { key: "hero_cta_text", label: "Texto del botón principal", kind: "text", min: 2, max: 80 },
      { key: "hero_note", label: "Nota corta bajo el botón", hint: EMPTY_HIDES, kind: "text", max: 120 }
    ]
  },
  {
    id: "contacto",
    title: "Contacto",
    description: "Aparece en la cabecera, el pie de página y la página de contacto.",
    fields: [
      {
        key: "whatsapp_number",
        label: "Número de WhatsApp",
        hint: "Con el indicativo del país y sin espacios. Ej.: 573001234567",
        kind: "tel",
        min: 7,
        max: 30
      },
      {
        key: "whatsapp_default_message",
        label: "Mensaje que llega por defecto",
        hint: "El cliente lo ve escrito al abrir WhatsApp y puede cambiarlo.",
        kind: "textarea",
        min: 4,
        max: 300
      },
      {
        key: "business_district",
        label: "Barrio o sector",
        hint: `Sin la dirección exacta. ${EMPTY_HIDES}`,
        kind: "text",
        max: 80
      },
      {
        key: "business_hours",
        label: "Horario de atención",
        hint: `Ej.: Lunes a sábado, 8 a. m. a 6 p. m. ${EMPTY_HIDES}`,
        kind: "text",
        max: 160
      },
      {
        key: "instagram_url",
        label: "Enlace de Instagram",
        hint: `Ej.: https://instagram.com/tu_cuenta. ${EMPTY_HIDES}`,
        kind: "url",
        max: 200
      }
    ]
  },
  {
    id: "servicios",
    title: "Servicios",
    description: "La sección de servicios de la portada.",
    fields: [
      { key: "services_title", label: "Título de la sección", kind: "text", min: 2, max: 120 },
      { key: "services_text", label: "Texto de la sección", kind: "textarea", min: 2, max: 400 },
      { key: "service_1_title", label: "Servicio 1: título", kind: "text", min: 2, max: 80 },
      { key: "service_1_text", label: "Servicio 1: texto", kind: "textarea", min: 2, max: 240 },
      { key: "service_2_title", label: "Servicio 2: título", kind: "text", min: 2, max: 80 },
      { key: "service_2_text", label: "Servicio 2: texto", kind: "textarea", min: 2, max: 240 },
      { key: "service_3_title", label: "Servicio 3: título", kind: "text", min: 2, max: 80 },
      { key: "service_3_text", label: "Servicio 3: texto", kind: "textarea", min: 2, max: 240 }
    ]
  },
  {
    id: "nosotros",
    title: "Nosotros y cierre",
    description: "La página «Nosotros» y el bloque final de cada página.",
    fields: [
      { key: "about_description", label: "Texto de «Nosotros»", kind: "textarea", min: 10, max: 700 },
      { key: "closing_title", label: "Título del cierre", kind: "text", min: 2, max: 120 },
      { key: "closing_text", label: "Texto del cierre", kind: "textarea", min: 2, max: 300 }
    ]
  },
  {
    id: "google",
    title: "Google",
    description: "Cómo aparece la tienda en los resultados de búsqueda.",
    fields: [
      {
        key: "meta_title",
        label: "Título para Google",
        hint: "El título azul del resultado. Mejor por debajo de 60 caracteres.",
        kind: "text",
        min: 5,
        max: 120
      },
      {
        key: "meta_description",
        label: "Descripción para Google",
        hint: "El texto gris bajo el título. Mejor entre 120 y 160 caracteres.",
        kind: "textarea",
        min: 10,
        max: 220
      }
    ]
  }
];

export const SETTING_FIELDS: SettingField[] = SETTING_GROUPS.flatMap((group) => group.fields);

export const SETTING_FIELD_BY_KEY = new Map<string, SettingField>(SETTING_FIELDS.map((field) => [field.key, field]));

export const SETTING_LABELS = new Map<string, string>(SETTING_FIELDS.map((field) => [field.key, field.label]));

/**
 * Se puede dejar vacío: la tienda oculta ese dato. La lista vive en
 * lib/settings-defaults.ts, la misma que usa la tienda al leer.
 */
export function isOptionalSetting(field: SettingField) {
  return OPTIONAL_SETTING_KEYS.has(field.key);
}

/**
 * Mensaje de error de un campo, o null si está bien. Lo usan el panel (al
 * escribir) y la API de settings (al guardar): una sola regla.
 */
export function validateSetting(field: SettingField, raw: string): string | null {
  const value = raw.trim();
  if (isOptionalSetting(field) && value === "") return null;
  if (field.min && value.length < field.min) {
    return value === "" ? "Este texto no puede quedar vacío." : `Escribe al menos ${field.min} caracteres.`;
  }
  if (value.length > field.max) return `Máximo ${field.max} caracteres (llevas ${value.length}).`;
  if (field.kind === "url" && !isWebUrl(value)) {
    return "Pega el enlace completo, empezando por https://";
  }
  if (field.kind === "tel" && !/^\+?[\d\s-]+$/.test(value)) return "Escribe solo números.";
  return null;
}
