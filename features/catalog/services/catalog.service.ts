import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { CAROUSEL_MAX, parseCarouselOrder, sortByCarouselOrder } from "@/lib/carousel-order";
import type { Brand, Design } from "@/types";
import { getPromotionMeta } from "@/lib/utils";
import { ownPhoto } from "@/lib/photos";
import { getCarouselOrderValue } from "@/lib/settings";
import { STORE_TAG } from "@/lib/store-cache";

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
 * Un error de la base no es "no hay datos": se lanza para que lo atrape
 * app/error.tsx ("No pudimos cargar esta página") en vez de mostrar una
 * tienda vacía o un 404 que Google tomaría por definitivo.
 */
function fail(where: string, message: string): never {
  throw new Error(`${where}: ${message}`);
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
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id,name,slug,description,logo_url,is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) fail("getBrands", error.message);
  return data ?? [];
});

/**
 * Fotos cuyo archivo ya no está en Storage (se borró a mano en Supabase y el
 * diseño lo sigue apuntando). Storage responde 400 a un objeto que no existe.
 * Si no responde o tarda, la foto se deja como está: nunca se quita una foto
 * por un fallo de red. Corre al regenerar la página (ISR), no en cada visita.
 */
async function findMissingPhotos(urls: string[]): Promise<Set<string>> {
  const unique = [...new Set(urls.filter(Boolean))];
  const missing = await Promise.all(
    unique.map(async (url) => {
      try {
        const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
        return res.status === 400 || res.status === 404 ? url : null;
      } catch {
        return null;
      }
    })
  );
  return new Set(missing.filter((url): url is string => url !== null));
}

/**
 * Todos los diseños activos de marcas activas, ordenados por nombre. Uno con
 * foto de stock o con la foto perdida queda "sin foto" (image_url vacío).
 * La tienda usa getStoreDesigns; esta lista completa es para la demo del panel.
 */
export const getActiveDesigns = cache(async (): Promise<DesignWithBrand[]> => {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("designs")
    .select(`${DESIGN_FIELDS},brands!inner(name,slug,is_active)`)
    .eq("is_active", true)
    .eq("brands.is_active", true)
    .order("name", { ascending: true });

  if (error) fail("getActiveDesigns", error.message);
  const designs = ((data ?? []) as Array<Design & { brands?: BrandJoin }>).map(withBrand);
  const missing = await findMissingPhotos(designs.map((design) => design.image_url ?? ""));
  if (!missing.size) return designs;
  return designs.map((design) => (design.image_url && missing.has(design.image_url) ? { ...design, image_url: "" } : design));
});

/**
 * Lo que la tienda muestra: solo diseños con foto propia. Una tarjeta con
 * "Foto no disponible" en una tienda que vende por la foto se ve rota; el
 * panel avisa en Resumen cuántos quedan fuera por no tener foto.
 */
export const getStoreDesigns = cache(async (): Promise<DesignWithBrand[]> => {
  const designs = await getActiveDesigns();
  return designs.filter((design) => design.image_url);
});

/**
 * Los mismos diseños, guardados 5 minutos fuera del render. La búsqueda es la
 * única página de la tienda que se arma en cada visita (lee ?q=): así no
 * consulta Supabase ni revisa las fotos con cada búsqueda. refreshStore() la
 * borra al guardar en el panel.
 */
// La clave cambia cuando cambia lo que se guarda: la caché de datos de Vercel
// sobrevive entre despliegues y serviría una vez la lista vieja.
export const getSearchableDesigns = unstable_cache(() => getStoreDesigns(), ["tienda-disenos-con-foto"], {
  revalidate: 300,
  tags: [STORE_TAG]
});

// Inicio: un diseño con foto por marca activa, con precio y botón de WhatsApp.
// PostgREST no tiene "un registro por grupo" en el cliente JS, así que se
// agrupa en memoria: a esta escala (marcas x diseños de un taller) es trivial.
export async function getFeaturedDesigns(limit = 8): Promise<DesignWithBrand[]> {
  const designs = await getStoreDesigns();
  const seenBrands = new Set<string>();
  const featured: DesignWithBrand[] = [];
  const ordered = [...designs].sort(
    (a, b) => a.brand_name.localeCompare(b.brand_name, "es") || a.name.localeCompare(b.name, "es")
  );
  for (const design of ordered) {
    if (seenBrands.has(design.brand_id)) continue;
    seenBrands.add(design.brand_id);
    featured.push(design);
    if (featured.length >= limit) break;
  }
  return featured;
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
  const supabase = createPublicSupabaseClient();
  // El orden sale de la misma lectura de settings que los textos de la página.
  const [{ data, error }, orderValue] = await Promise.all([
    supabase
      .from("images")
      .select(
        "id,storage_path,alt_text,created_at,designs(name,slug,is_active,base_price,discount_price,promotion_label,promotion_active,promotion_starts_at,promotion_ends_at),brands(name,slug)"
      )
      .eq("is_weekly_highlight", true)
      .order("created_at", { ascending: false })
      .limit(50),
    getCarouselOrderValue()
  ]);

  if (error) fail("getCarouselSlides", error.message);

  type Row = {
    id: string;
    storage_path: string;
    alt_text: string | null;
    created_at: string;
    designs: SlideDesign | SlideDesign[] | null;
    brands: BrandJoin;
  };

  const ordered = sortByCarouselOrder((data ?? []) as Row[], parseCarouselOrder(orderValue)).slice(
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
