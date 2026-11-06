import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { ClosingCta } from "@/components/shared/closing-cta";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { siteConfig } from "@/config/site";
import { BrandBar } from "@/features/catalog/components/brand-bar";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { getActiveDesigns, getBrands, type DesignWithBrand } from "@/features/catalog/services/catalog.service";
import { pageMetadata } from "@/lib/seo";
import { cn, getPromotionMeta } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

/**
 * Marca activa y sus diseños, en una sola ola: las dos listas son las mismas
 * (cacheadas) que usan el catálogo y la barra de marcas.
 */
async function loadBrand(slug: string) {
  const [brands, designs] = await Promise.all([getBrands(), getActiveDesigns()]);
  const brand = brands.find((item) => item.slug === slug);
  return { brands, brand, designs: brand ? designs.filter((design) => design.brand_id === brand.id) : [] };
}

/** Las marcas activas se generan al publicar; una marca nueva, en su primera visita. */
export async function generateStaticParams() {
  try {
    return (await getBrands()).map((brand) => ({ slug: brand.slug }));
  } catch {
    // Si la base no responde al publicar, no se tumba el despliegue: cada
    // marca se genera en su primera visita.
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { brand, designs } = await loadBrand(slug);
  if (!brand) return { title: "Marca no encontrada" };
  const photo = designs.find((design) => design.image_url);

  const metadata = await pageMetadata({
    title: `Tapicería para moto ${brand.name} en Medellín`,
    // Siempre la frase con la marca y la ciudad: la descripción de la marca es
    // texto de la tienda (se ve en la página), no un resumen para Google.
    description: `Diseños de tapicería para moto ${brand.name} con precio de referencia. Cotiza tu silla por WhatsApp en Medellín.`,
    path: `/marca/${brand.slug}`,
    image: photo?.image_url,
    imageAlt: photo ? `Silla de moto ${photo.name} (${brand.name}) tapizada por MotoSmart` : undefined
  });
  // Una marca sin diseños publicados no debe salir en Google como página vacía.
  return designs.length ? metadata : { ...metadata, robots: { index: false, follow: true } };
}

/** Precio que paga hoy el cliente: el de promoción si está vigente. */
function priceToday(design: DesignWithBrand) {
  const promo = getPromotionMeta(
    design.base_price,
    design.discount_price,
    design.promotion_active,
    design.promotion_starts_at,
    design.promotion_ends_at
  );
  return promo.hasPromotion && design.discount_price ? design.discount_price : design.base_price;
}

/** Migas y sillas con precio en pesos, para los resultados de Google. */
function brandJsonLd(brand: { name: string; slug: string }, designs: DesignWithBrand[]) {
  const url = `${siteConfig.url}/marca/${brand.slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Catálogo", item: `${siteConfig.url}/catalogo` },
        { "@type": "ListItem", position: 2, name: brand.name, item: url }
      ]
    },
    ...designs
      // Un precio sin los miles ($148) no se publica como oferta: está mal escrito.
      .filter((design) => priceToday(design) >= 1000)
      .map((design) => ({
        "@context": "https://schema.org",
        "@type": "Product",
        name: `Silla de moto ${design.name} (${brand.name})`,
        ...(design.image_url ? { image: design.image_url } : {}),
        brand: { "@type": "Brand", name: brand.name },
        offers: {
          "@type": "Offer",
          price: priceToday(design),
          priceCurrency: "COP",
          url: `${url}#diseno-${design.slug}`
        }
      }))
  ];
}

export default async function MarcaPage({ params }: Props) {
  const { slug } = await params;
  const { brands, brand, designs } = await loadBrand(slug);
  if (!brand) notFound();

  const count = designs.length === 1 ? "1 diseño" : `${designs.length} diseños`;

  return (
    <>
      <JsonLd data={brandJsonLd(brand, designs)} />
      <PageIntro
        title={`Tapicería para moto ${brand.name}`}
        crumbs={[{ label: "Catálogo", href: "/catalogo" }, { label: brand.name }]}
        lead={brand.description?.trim() || undefined}
      >
        {designs.length ? <p className="mt-2 text-sm text-ink-3">{count}</p> : null}
      </PageIntro>
      <BrandBar brands={brands} active={brand.slug} />

      <section aria-labelledby="sillas-marca" className={cn(containerClasses, "py-8 md:py-10")}>
        <h2 id="sillas-marca" className="sr-only">
          Sillas de {brand.name}
        </h2>
        <DesignGrid
          designs={designs}
          showBrand={false}
          priorityCount={2}
          empty={
            <p className="max-w-xl text-lg text-ink-2">
              Todavía no hay diseños de {brand.name} publicados. Escríbenos por WhatsApp con tu modelo y te cotizamos la silla a
              medida.
            </p>
          }
        />
      </section>

      <ClosingCta />
    </>
  );
}
