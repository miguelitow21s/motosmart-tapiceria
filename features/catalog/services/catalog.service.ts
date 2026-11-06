import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CAROUSEL_MAX, parseCarouselOrder, sortByCarouselOrder } from "@/lib/carousel-order";
import type { Brand, Design } from "@/types";
import { getPromotionMeta } from "@/lib/utils";

const DESIGN_FIELDS =
  "id,brand_id,name,slug,short_description,image_url,is_active,base_price,discount_price,promotion_label,promotion_active,promotion_starts_at,promotion_ends_at";

/** Diseño con el nombre y el slug de su marca, para la tarjeta y el mensaje de WhatsApp. */
export type DesignWithBrand = Design & { brand_name: string; brand_slug: string };

type BrandJoin = { name?: string; slug?: string } | Array<{ name?: string; slug?: string }> | null;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Las filas de prueba del seed traen una foto de stock de Unsplash. La tienda
 * no la muestra como si fuera un trabajo propio: queda como "sin foto" y se
 * reemplaza subiendo la real desde el panel.
 */
function ownPhoto(url: string | null | undefined) {
  if (!url || /^https?:\/\/images\.unsplash\.com\//i.test(url)) return "";
  return url;
}

/** Con foto propia primero; el resto conserva su orden. */
function photoFirst(a: Design, b: Design) {
  return Number(Boolean(b.image_url)) - Number(Boolean(a.image_url));
}

/** Orden de la tienda: en promoción, luego con foto, luego por nombre. */
export function sortForStore<T extends Design>(designs: T[], now = new Date()): T[] {
  const hasPromo = (design: Design) =>
    getPromotionMeta(
      design.base_price,
      design.discount_price,
      design.promotion_active,
      design.promotion_starts_at,
      design.promotion_ends_at,
      now
    ).hasPromotion;
  return [...designs].sort(
    (a, b) => Number(hasPromo(b)) - Number(hasPromo(a)) || photoFirst(a, b) || a.name.localeCompare(b.name, "es")
  );
}

function withBrand(row: Design & { brands?: BrandJoin }): DesignWithBrand {
  const { brands, ...design } = row;
  const brand = one(brands);
  return {
    ...design,
    image_url: ownPhoto(design.image_url),
    brand_name: brand?.name ?? "",
    brand_slug: brand?.slug ?? ""
  };
}

export const getBrands = cache(async (): Promise<Brand[]> => {
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
});

/** Todos los diseños activos de marcas activas, ordenados por nombre. */
export const getActiveDesigns = cache(async (): Promise<DesignWithBrand[]> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("designs")
    .select(`${DESIGN_FIELDS},brands!inner(name,slug,is_active)`)
    .eq("is_active", true)
    .eq("brands.is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("getActiveDesigns", error.message);
    return [];
  }
  return ((data ?? []) as Array<Design & { brands?: BrandJoin }>).map(withBrand);
});

// Inicio: un diseño real por marca activa (con foto propia si la marca tiene),
// con precio y botón de WhatsApp.
// PostgREST no tiene "un registro por grupo" en el cliente JS, así que se
// agrupa en memoria: a esta escala (marcas x diseños de un taller) es trivial.
export async function getFeaturedDesigns(limit = 8): Promise<DesignWithBrand[]> {
  const designs = await getActiveDesigns();
  const seenBrands = new Set<string>();
  const featured: DesignWithBrand[] = [];
  const ordered = [...designs].sort(
    (a, b) => a.brand_name.localeCompare(b.brand_name, "es") || photoFirst(a, b) || a.name.localeCompare(b.name, "es")
  );
  for (const design of ordered) {
    if (seenBrands.has(design.brand_id)) continue;
    seenBrands.add(design.brand_id);
    featured.push(design);
    if (featured.length >= limit) break;
  }
  return featured;
}

/** Marca activa por slug. null si no existe o está oculta: la página responde 404. */
export const getBrandBySlug = cache(async (slug: string): Promise<Brand | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id,name,slug,description,logo_url,is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    console.error("getBrandBySlug", error.message);
    return null;
  }
  return data;
});

export async function getDesignsByBrand(brand: Pick<Brand, "id" | "name" | "slug">): Promise<DesignWithBrand[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("designs")
    .select(DESIGN_FIELDS)
    .eq("brand_id", brand.id)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    console.error("getDesignsByBrand", error.message);
    return [];
  }
  return ((data ?? []) as Design[]).map((design) => ({ ...design, brand_name: brand.name, brand_slug: brand.slug }));
}

type SlideDesign = Pick<
  Design,
  | "name"
  | "slug"
  | "is_active"
  | "base_price"
  | "discount_price"
  | "promotion_label"
  | "promotion_active"
  | "promotion_starts_at"
  | "promotion_ends_at"
>;

/** Foto del carrusel semanal, con el diseño y la marca que la administradora le asignó. */
export type CarouselSlide = {
  id: string;
  image: string;
  alt: string;
  title: string;
  brandName: string | null;
  /** Diseño activo asociado: trae el precio. null si la foto no tiene diseño o está oculto. */
  design: SlideDesign | null;
  /** Adónde lleva tocar la foto: la tarjeta del diseño en su marca, la marca o el catálogo. */
  href: string;
};

/**
 * "Trabajos de la semana": las fotos marcadas en el panel, en el orden que
 * guardó la administradora. Se lee en el servidor (antes el navegador las
 * pedía después de cargar y mientras tanto mostraba fotos de stock).
 */
export const getCarouselSlides = cache(async (): Promise<CarouselSlide[]> => {
  const supabase = await createServerSupabaseClient();
  const [{ data, error }, { data: orderSetting, error: orderError }] = await Promise.all([
    supabase
      .from("images")
      .select(
        "id,storage_path,alt_text,created_at,designs(name,slug,is_active,base_price,discount_price,promotion_label,promotion_active,promotion_starts_at,promotion_ends_at),brands(name,slug)"
      )
      .eq("is_weekly_highlight", true)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("settings").select("value").eq("key", "carousel_order").maybeSingle()
  ]);

  if (error) {
    console.error("getCarouselSlides", error.message);
    return [];
  }
  // Sin el orden guardado se cae al orden por fecha: nunca vaciar el carrusel por esto.
  if (orderError) console.error("getCarouselSlides order", orderError.message);

  type Row = {
    id: string;
    storage_path: string;
    alt_text: string | null;
    created_at: string;
    designs: SlideDesign | SlideDesign[] | null;
    brands: BrandJoin;
  };

  const ordered = sortByCarouselOrder((data ?? []) as Row[], parseCarouselOrder(orderSetting?.value)).slice(
    0,
    CAROUSEL_MAX
  );

  return ordered.map((row) => {
    const linked = one(row.designs);
    const design = linked && linked.is_active !== false ? linked : null;
    const brand = one(row.brands);
    const title = design?.name || row.alt_text || brand?.name || "Trabajo reciente";
    const href = brand?.slug
      ? design?.slug
        ? `/marca/${brand.slug}#diseno-${design.slug}`
        : `/marca/${brand.slug}`
      : "/catalogo";

    return {
      id: row.id,
      image: row.storage_path,
      alt: row.alt_text || `Silla de moto ${title} tapizada por MotoSmart`,
      title,
      brandName: brand?.name ?? null,
      design,
      href
    };
  });
});
