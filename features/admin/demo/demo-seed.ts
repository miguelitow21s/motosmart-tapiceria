/*
  Datos de la demostración del panel (/panel-demo, solo con ADMIN_DEMO=1).
  Parte de lo público de la tienda (marcas, diseños, carrusel, pilotos,
  textos) y lo convierte en filas como las que devuelve /api/admin. Nada de
  esto se escribe en la base: la demo guarda todo en memoria del navegador.

  Casos:
  - normal: la tienda tal como está.
  - extremo: nombres larguísimos, precios enormes, promos vencidas o
    programadas, sin fotos, carrusel lleno, 70 fotos... (break-ui).
  - vacio: una tienda recién creada, para ver los estados vacíos.
*/

import { CAROUSEL_MAX } from "@/lib/carousel-order";

export type DemoCase = "normal" | "extremo" | "vacio";

type Row = Record<string, unknown>;

export type DemoSeed = {
  brands: Row[];
  designs: Row[];
  images: Row[];
  settings: Record<string, string>;
  carouselOrder: string[];
  features: Row[];
  activity: Row[];
  products: Row[];
  riders: Row[];
};

export type PublicData = {
  brands: Array<{ id: string; name: string; slug: string; description?: string | null; logo_url?: string | null; is_active?: boolean }>;
  designs: Array<{ id: string; brand_id: string; name: string; slug: string; image_url?: string | null }>;
  slides: Array<{ id: string; image: string; alt: string; brandName: string | null; design: { slug?: string | null } | null }>;
  riders: Array<{ id: string }>;
  settings: Record<string, string>;
};

const DAY = 24 * 3600 * 1000;

function ago(days: number, now: number) {
  return new Date(now - days * DAY).toISOString();
}

function demoId(prefix: string, index: number) {
  // Forma de uuid para que nada en el panel dependa de que no lo sea.
  const hex = (prefix.charCodeAt(0) * 1000 + index).toString(16).padStart(12, "0").slice(-12);
  return `00000000-0000-4000-8000-${hex}`;
}

const FEATURES: Row[] = [
  { name: "catalog_enabled", enabled: true },
  { name: "riders_enabled", enabled: true },
  { name: "checkout_enabled", enabled: true },
  { name: "admin_uploads_enabled", enabled: true },
  { name: "customizer_enabled", enabled: false }
];

function baseSeed(data: PublicData, now: number): DemoSeed {
  const brands: Row[] = data.brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description ?? "",
    logo_url: brand.logo_url ?? null,
    is_active: brand.is_active ?? true
  }));

  const designs: Row[] = data.designs.map((design, index) => {
    const row: Row = { ...design, image_url: design.image_url || null, created_at: ago(index * 3, now) };
    // La tienda agrega el nombre de la marca a cada diseño; la API del panel no.
    delete row.brand_name;
    delete row.brand_slug;
    return row;
  });

  const brandByName = new Map(data.brands.map((brand) => [brand.name, brand.id]));
  const images: Row[] = data.slides.map((slide, index) => {
    const design = slide.design?.slug ? data.designs.find((item) => item.slug === slide.design?.slug) : undefined;
    return {
      id: slide.id,
      storage_path: slide.image,
      alt_text: slide.alt,
      brand_id: design?.brand_id ?? (slide.brandName ? (brandByName.get(slide.brandName) ?? null) : null),
      design_id: design?.id ?? null,
      is_weekly_highlight: true,
      created_at: ago(index + 1, now)
    };
  });
  const used = new Set(images.map((image) => image.storage_path));
  data.designs.forEach((design, index) => {
    if (!design.image_url || used.has(design.image_url)) return;
    used.add(design.image_url);
    images.push({
      id: demoId("i", index),
      storage_path: design.image_url,
      alt_text: `Silla ${design.name}`,
      brand_id: design.brand_id,
      design_id: design.id,
      is_weekly_highlight: false,
      created_at: ago(10 + index, now)
    });
  });

  const first = data.designs[0];
  const second = data.designs[1] ?? first;
  const activity: Row[] = [
    { action: "update", entity: "design", entity_id: first?.id ?? null, detail: { slug: first?.slug }, days: 0.02 },
    { action: "upload", entity: "image", entity_id: null, detail: { isWeeklyHighlight: true }, days: 0.3 },
    { action: "upsert", entity: "setting", entity_id: "hero_tagline", detail: { key: "hero_tagline" }, days: 1 },
    { action: "update", entity: "image", entity_id: null, detail: { setAsDesignImage: true, design_id: second?.id }, days: 2 },
    { action: "toggle_feature", entity: "feature", entity_id: "riders_enabled", detail: { enabled: true }, days: 4 },
    { action: "create", entity: "design", entity_id: second?.id ?? null, detail: { slug: second?.slug }, days: 6 },
    { action: "upsert", entity: "setting", entity_id: "carousel_order", detail: { key: "carousel_order" }, days: 9 },
    { action: "upload", entity: "rider_photo", entity_id: null, detail: { rider_name: "Camilo" }, days: 15 },
    { action: "update", entity: "design", entity_id: first?.id ?? null, detail: { slug: first?.slug }, days: 120 }
  ].map((entry, index) => {
    const { days, ...row } = entry;
    return { id: demoId("a", index), ...row, created_at: ago(days, now) };
  });

  const products: Row[] = first
    ? [
        { id: demoId("p", 1), design_id: first.id, sku: "SILLA-001", stock: 3, is_active: true, designs: { name: first.name } },
        { id: demoId("p", 2), design_id: second.id, sku: "SILLA-002", stock: 0, is_active: false, designs: { name: second.name } }
      ]
    : [];

  return {
    brands,
    designs,
    images,
    settings: { ...data.settings },
    carouselOrder: data.slides.map((slide) => slide.id),
    features: FEATURES,
    activity,
    products,
    riders: data.riders.map((rider, index) => ({ ...rider, display_order: index }))
  };
}

const LONG_NAME = "Silla doble costura diamante con espuma de alta densidad y bo";
const UNBROKEN = "Superlargodiseñosinespaciosparaprobarelcortedelinea";

function extremeSeed(seed: DemoSeed, now: number): DemoSeed {
  const brandId = (seed.brands[0]?.id as string | undefined) ?? demoId("b", 0);
  const brands: Row[] = [
    ...seed.brands,
    {
      id: demoId("b", 1),
      name: "Harley-Davidson Custom Vehicle Operations Medellín",
      slug: "harley-davidson-cvo-medellin",
      description: "Marca sin diseños y sin logo, oculta en la tienda. ".repeat(5).trim(),
      logo_url: null,
      is_active: false
    },
    { id: demoId("b", 2), name: "Ñu", slug: "nu", description: "", logo_url: "https://example.invalid/logo-roto.png", is_active: true }
  ];
  if (!seed.brands.length) brands.unshift({ id: brandId, name: "Yamaha", slug: "yamaha", description: "", logo_url: null, is_active: true });

  const tomorrow = new Date(now + DAY).toISOString();
  const nextWeek = new Date(now + 7 * DAY).toISOString();
  const lastWeek = new Date(now - 7 * DAY).toISOString();
  const yesterday = new Date(now - DAY).toISOString();
  const photo = (seed.images[0]?.storage_path as string | undefined) ?? null;

  const extra: Row[] = [
    {
      name: LONG_NAME,
      base_price: 999_999_999,
      discount_price: 1,
      promotion_active: true,
      promotion_label: "Precio especial de lanzamiento por tiempo limitado hasta agota",
      image_url: photo
    },
    { name: UNBROKEN, base_price: 145_000, image_url: null, is_active: false },
    {
      name: "Pulsar NS 200 · promo programada",
      base_price: 180_000,
      discount_price: 150_000,
      promotion_active: true,
      promotion_label: "Llega el lunes",
      promotion_starts_at: tomorrow,
      promotion_ends_at: nextWeek,
      image_url: photo
    },
    {
      name: "AKT TT 125 · promo vencida",
      base_price: 120_000,
      discount_price: 99_000,
      promotion_active: true,
      promotion_label: "Semana de la moto",
      promotion_starts_at: lastWeek,
      promotion_ends_at: yesterday,
      image_url: photo
    },
    { name: "Boxer CT · promo sin precio", base_price: 98_000, discount_price: null, promotion_active: true, promotion_label: "Oferta", image_url: null },
    { name: "Pulsar 🔥 edición negra 🏍️", base_price: 210_000, image_url: photo },
    { name: "Ab", base_price: 1, image_url: null }
  ].map((row, index) => ({
    id: demoId("d", index),
    brand_id: brandId,
    slug: `extremo-${index}`,
    short_description: index === 0 ? "Descripción al límite. ".repeat(8).slice(0, 180) : "",
    discount_price: null,
    promotion_label: "",
    promotion_active: false,
    promotion_starts_at: null,
    promotion_ends_at: null,
    is_active: true,
    created_at: ago(-index, now),
    ...row
  }));

  // 70 fotos: la cuadrícula pagina, los nombres se cortan, una foto rota.
  const pool = seed.images.length ? seed.images : [{ storage_path: "https://example.invalid/sin-foto.jpg" }];
  const images: Row[] = Array.from({ length: 70 }, (_, index) => ({
    id: demoId("i", 500 + index),
    storage_path: index === 3 ? "https://example.invalid/foto-rota.jpg" : pool[index % pool.length].storage_path,
    alt_text: index === 1 ? `${LONG_NAME} vista de lado con la costura y el logo bordado en la parte de atrás` : `Foto ${index + 1}`,
    brand_id: index % 3 === 0 ? null : brandId,
    design_id: index % 4 === 0 ? (extra[index % extra.length].id as string) : null,
    is_weekly_highlight: index < CAROUSEL_MAX,
    created_at: ago(index / 2, now)
  }));

  const kinds = [
    { action: "update", entity: "design" },
    { action: "delete", entity: "brand" },
    { action: "clear", entity: "carousel" },
    { action: "weird_action", entity: "unknown_entity" },
    { action: "upsert", entity: "setting" },
    { action: "toggle_feature", entity: "feature" }
  ];
  const activity: Row[] = Array.from({ length: 50 }, (_, index) => {
    const kind = kinds[index % kinds.length];
    return {
      id: demoId("a", 100 + index),
      ...kind,
      entity_id: kind.entity === "feature" ? "catalog_enabled" : kind.entity === "setting" ? "clave_que_no_existe" : null,
      detail: index % 5 === 0 ? null : { slug: UNBROKEN, enabled: index % 2 === 0, key: "clave_que_no_existe" },
      created_at: ago(index * 3, now)
    };
  });

  const riders: Row[] = [
    ...seed.riders,
    {
      id: demoId("r", 1),
      storage_path: "https://example.invalid/piloto-roto.jpg",
      rider_name: "Juan Sebastián de la Santísima Trinidad Restrepo Echeverri",
      moto_info: "Kawasaki Ninja ZX-10R edición aniversario 40 años verde lima",
      is_active: false,
      display_order: seed.riders.length
    }
  ];

  return {
    ...seed,
    brands,
    designs: [...seed.designs, ...extra],
    images,
    carouselOrder: images.slice(0, CAROUSEL_MAX).map((image) => image.id as string),
    settings: {
      ...seed.settings,
      hero_tagline: "Tapicería para moto hecha a mano en Medellín con costura doble, espuma de alta densidad y garantía escrita de un año completo",
      business_hours: "Lunes a viernes de 8:00 a. m. a 6:00 p. m., sábados de 8:00 a. m. a 1:00 p. m., domingos y festivos cerrado",
      instagram_url: "no es un enlace"
    },
    activity,
    products: [
      ...seed.products,
      {
        id: demoId("p", 9),
        design_id: extra[0].id,
        sku: "REFERENCIA-MUY-LARGA-PARA-PROBAR-QUE-NO-SE-SALGA-DE-LA-FILA-2026",
        stock: 1_234_567,
        is_active: true,
        designs: { name: LONG_NAME }
      }
    ],
    riders
  };
}

function emptySeed(): DemoSeed {
  return {
    brands: [],
    designs: [],
    images: [],
    settings: {},
    carouselOrder: [],
    features: FEATURES,
    activity: [],
    products: [],
    riders: []
  };
}

export function buildDemoSeed(data: PublicData, demoCase: DemoCase, now = Date.now()): DemoSeed {
  if (demoCase === "vacio") return emptySeed();
  const seed = baseSeed(data, now);
  return demoCase === "extremo" ? extremeSeed(seed, now) : seed;
}
