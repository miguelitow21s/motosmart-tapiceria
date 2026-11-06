import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Section } from "@/components/shared/section";
import { BrandBar } from "@/features/catalog/components/brand-bar";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { getActiveDesigns, type DesignWithBrand } from "@/features/catalog/services/catalog.service";

/*
  Tarjetas de la tienda con datos al límite (break-ui): nombres larguísimos o
  sin espacios, precios enormes, sin foto, promociones de todo tipo y muchas
  marcas. Solo existe con ADMIN_DEMO=1; en producción responde 404. Lee los
  diseños reales (solo lectura) y les suma casos inventados que no se guardan.
*/

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tienda (casos extremos)", robots: { index: false, follow: false } };

const DAY = 24 * 60 * 60 * 1000;

function fake(index: number, changes: Partial<DesignWithBrand>): DesignWithBrand {
  return {
    id: `extremo-${index}`,
    brand_id: "extremo",
    name: "Diseño",
    slug: `extremo-${index}`,
    short_description: "",
    image_url: "",
    is_active: true,
    base_price: 180000,
    discount_price: null,
    promotion_label: "",
    promotion_active: false,
    promotion_starts_at: null,
    promotion_ends_at: null,
    brand_name: "AKT",
    brand_slug: "akt",
    ...changes
  };
}

export default async function StoreStressPage() {
  if (process.env.ADMIN_DEMO !== "1") notFound();

  const real = await getActiveDesigns();
  // Varias fotos de AKT ya no existen en Storage: mejor una de otra marca.
  const photo = (real.find((design) => design.image_url && design.brand_slug !== "akt") ?? real.find((design) => design.image_url))
    ?.image_url ?? "";
  const now = Date.now();

  const extremes: DesignWithBrand[] = [
    fake(1, {
      name: "Silla de lujo para Yamaha XTZ 250 Lander con costura doble y bordado",
      short_description:
        "Cuero sintético de alto tráfico, espuma de doble densidad, costura de diamante en rojo y bordado del logo en el respaldo del pasajero.",
      image_url: photo,
      base_price: 99999999, // el tope (lib/price-limits.ts)
      brand_name: "Harley-Davidson Motorcycles de Colombia S.A.S."
    }),
    fake(2, { name: "Superlargodiseñosinespaciosparaprobarelcorte", base_price: 1 }),
    fake(3, {
      name: "Promo vigente",
      image_url: photo,
      base_price: 450000,
      discount_price: 315000,
      promotion_active: true,
      promotion_label: "Promoción de temporada con instalación incluida en Medellín",
      promotion_starts_at: new Date(now - DAY).toISOString(),
      promotion_ends_at: new Date(now + 2 * DAY).toISOString()
    }),
    fake(4, {
      name: "Promo vencida",
      base_price: 300000,
      discount_price: 250000,
      promotion_active: true,
      promotion_label: "Ya pasó",
      promotion_starts_at: new Date(now - 9 * DAY).toISOString(),
      promotion_ends_at: new Date(now - DAY).toISOString()
    }),
    fake(5, {
      name: "Promo programada",
      base_price: 300000,
      discount_price: 210000,
      promotion_active: true,
      promotion_label: "Llega el lunes",
      promotion_starts_at: new Date(now + 3 * DAY).toISOString(),
      promotion_ends_at: new Date(now + 10 * DAY).toISOString()
    }),
    fake(6, { name: "Ñandú 🏍️ edición 🔥", short_description: "Emoji en el nombre y en la descripción ✨.", brand_name: "Ñu" }),
    // Foto rota en un host permitido (next/image rechaza hosts no configurados).
    fake(7, { name: "Ab", image_url: photo ? photo.replace(/(\.\w+)?$/, "-no-existe$1") : "", base_price: 148 }),
    fake(8, { name: "Sin marca", brand_name: "" })
  ];

  const brands = [
    ...real
      .map((design) => ({ name: design.brand_name, slug: design.brand_slug }))
      .filter((brand, index, list) => list.findIndex((other) => other.slug === brand.slug) === index),
    { name: "Harley-Davidson Motorcycles de Colombia", slug: "harley" },
    { name: "Royal Enfield", slug: "royal-enfield" },
    { name: "Ñu", slug: "nu" }
  ];

  return (
    <Section>
      <h1 className="text-title">Tienda: casos extremos</h1>
      <div className="mt-6">
        <BrandBar brands={brands} active="all" />
      </div>
      <div className="mt-6">
        <DesignGrid designs={[...extremes, ...real.slice(0, 4)]} />
      </div>
    </Section>
  );
}
