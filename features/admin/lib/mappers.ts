import type { ActivityEntry, AdminImage, Brand, Design, Feature, Product, RiderPhoto } from "@/features/admin/types";

// La API devuelve las filas de Supabase tal cual; aquí se normalizan una sola
// vez para que la interfaz nunca reciba null donde espera texto.

type Row = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value));
const nullableText = (value: unknown) => (typeof value === "string" && value ? value : null);

export function mapDesign(raw: unknown): Design {
  const item = (raw ?? {}) as Row;
  return {
    id: text(item.id),
    brand_id: text(item.brand_id),
    name: text(item.name),
    slug: text(item.slug),
    short_description: text(item.short_description),
    image_url: nullableText(item.image_url),
    base_price: Number(item.base_price ?? 0),
    discount_price: item.discount_price == null ? null : Number(item.discount_price),
    promotion_label: text(item.promotion_label),
    promotion_active: Boolean(item.promotion_active),
    promotion_starts_at: nullableText(item.promotion_starts_at),
    promotion_ends_at: nullableText(item.promotion_ends_at),
    is_active: Boolean(item.is_active),
    created_at: nullableText(item.created_at) ?? undefined
  };
}

export function mapBrand(raw: unknown): Brand {
  const item = (raw ?? {}) as Row;
  return {
    id: text(item.id),
    name: text(item.name),
    slug: text(item.slug),
    image_url: nullableText(item.logo_url) ?? nullableText(item.image_url),
    description: text(item.description),
    is_active: item.is_active == null ? true : Boolean(item.is_active)
  };
}

export function mapImage(raw: unknown): AdminImage {
  const item = (raw ?? {}) as Row;
  return {
    id: text(item.id),
    url: text(item.storage_path ?? item.url),
    alt: text(item.alt_text ?? item.alt),
    brand_id: nullableText(item.brand_id),
    design_id: nullableText(item.design_id),
    is_carousel: Boolean(item.is_weekly_highlight ?? item.is_carousel),
    created_at: text(item.created_at) || new Date().toISOString()
  };
}

export function mapFeature(raw: unknown): Feature {
  const item = (raw ?? {}) as Row;
  return { name: text(item.name ?? item.key), enabled: Boolean(item.enabled) };
}

export function mapActivity(raw: unknown): ActivityEntry {
  const item = (raw ?? {}) as Row;
  const detail = item.detail;
  return {
    id: text(item.id),
    action: text(item.action),
    entity: text(item.entity),
    entity_id: nullableText(item.entity_id),
    detail: detail && typeof detail === "object" && !Array.isArray(detail) ? (detail as Record<string, unknown>) : null,
    created_at: text(item.created_at) || new Date().toISOString()
  };
}

export function mapProduct(raw: unknown): Product {
  const item = (raw ?? {}) as Row;
  const design = item.designs as { name?: unknown } | Array<{ name?: unknown }> | null | undefined;
  const designName = Array.isArray(design) ? design[0]?.name : design?.name;
  return {
    id: text(item.id),
    design_id: text(item.design_id),
    sku: text(item.sku),
    stock: Number(item.stock ?? 0),
    is_active: Boolean(item.is_active),
    design_name: text(designName) || "Sin diseño"
  };
}

export function mapRiderPhoto(raw: unknown): RiderPhoto {
  const item = (raw ?? {}) as Row;
  return {
    id: text(item.id),
    storage_path: text(item.storage_path),
    rider_name: text(item.rider_name),
    moto_info: text(item.moto_info),
    is_active: Boolean(item.is_active),
    display_order: Number(item.display_order ?? 0)
  };
}

/** Los textos se guardan como { text: "..." }. */
export function parseSettingValue(raw: unknown) {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const maybeText = (raw as { text?: unknown }).text;
    if (typeof maybeText === "string") return maybeText;
  }
  return null;
}
