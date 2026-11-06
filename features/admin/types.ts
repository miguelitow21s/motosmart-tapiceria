// Tipos del panel tal como los usa la interfaz (ya normalizados desde la API
// por lib/mappers.ts).

export type Design = {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  short_description: string;
  image_url: string | null;
  base_price: number;
  discount_price: number | null;
  promotion_label: string;
  promotion_active: boolean;
  promotion_starts_at: string | null;
  promotion_ends_at: string | null;
  is_active: boolean;
  created_at?: string;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string;
  is_active: boolean;
};

export type AdminImage = {
  id: string;
  url: string;
  alt: string;
  brand_id: string | null;
  design_id: string | null;
  is_carousel: boolean;
  created_at: string;
};

export type Feature = {
  name: string;
  enabled: boolean;
};

export type ActivityEntry = {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type Product = {
  id: string;
  design_id: string;
  sku: string;
  stock: number;
  is_active: boolean;
  design_name: string;
};

export type RiderPhoto = {
  id: string;
  storage_path: string;
  rider_name: string;
  moto_info: string;
  is_active: boolean;
  display_order: number;
};

export type TabKey =
  | "overview"
  | "catalog"
  | "brands"
  | "carousel"
  | "gallery"
  | "riders"
  | "settings"
  | "features"
  | "activity";

/** Foto elegida en el teléfono o el computador, antes de subirla. */
export type UploadDraft = {
  id: string;
  file: File;
  preview: string;
  alt: string;
  brand_id: string;
  design_id: string;
  is_carousel: boolean;
  /** Reemplaza la foto principal del diseño elegido (la que se ve en el catálogo). */
  set_as_design_image: boolean;
  /** Motivo del último intento fallido; la foto sigue en la lista para reintentar. */
  error?: string;
};
