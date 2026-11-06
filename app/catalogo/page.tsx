import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClosingCta } from "@/components/shared/closing-cta";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { BrandBar } from "@/features/catalog/components/brand-bar";
import { CatalogSearch } from "@/features/catalog/components/catalog-search";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { getStoreDesigns, getBrands, sortForStore } from "@/features/catalog/services/catalog.service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const designs = await getStoreDesigns();
  const photo = designs.find((design) => design.image_url);
  return pageMetadata({
    title: "Catálogo de tapicería para moto por marca",
    description:
      "Diseños de tapicería para moto organizados por marca, con precio de referencia. Cotiza tu silla por WhatsApp en Medellín.",
    path: "/catalogo",
    image: photo?.image_url,
    imageAlt: photo ? `Silla de moto ${photo.name} tapizada por MotoSmart` : undefined
  });
}

/** Cuántas sillas de cada marca se muestran aquí antes de mandar a la página de la marca. */
const PER_BRAND = 4;

export default async function CatalogoPage() {
  const [enabled, brands, designs] = await Promise.all([
    isFeatureEnabled("catalog_enabled", { onError: "open" }),
    getBrands(),
    getStoreDesigns()
  ]);
  if (!enabled) redirect("/");

  const groups = brands
    .map((brand) => ({ brand, designs: sortForStore(designs.filter((design) => design.brand_id === brand.id)) }))
    .filter((group) => group.designs.length > 0);

  return (
    <>
      <PageIntro
        title="Catálogo"
        lead="Fundas y tapicería para moto por marca, con precio de referencia. Busca tu modelo o elige la marca."
      >
        <CatalogSearch />
      </PageIntro>
      <BrandBar brands={brands} active="all" />

      <div className={cn(containerClasses, "space-y-14 py-10 md:space-y-16 md:py-12")}>
        {groups.length ? (
          groups.map(({ brand, designs: brandDesigns }, index) => (
            <section key={brand.id} aria-labelledby={`marca-${brand.slug}`}>
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div>
                  <h2 id={`marca-${brand.slug}`} className="text-2xl md:text-3xl">
                    {brand.name}
                  </h2>
                  <p className="mt-1 text-sm text-ink-3">
                    {brandDesigns.length === 1 ? "1 diseño" : `${brandDesigns.length} diseños`}
                  </p>
                </div>
                <Link href={`/marca/${brand.slug}`} className="link-underline inline-flex min-h-11 items-center font-semibold">
                  {brandDesigns.length > PER_BRAND ? `Ver los ${brandDesigns.length} de ${brand.name}` : `Ir a ${brand.name}`}
                </Link>
              </div>
              <div className="mt-5">
                <DesignGrid
                  designs={brandDesigns.slice(0, PER_BRAND)}
                  showBrand={false}
                  priorityCount={index === 0 ? 2 : 0}
                  preview
                />
              </div>
            </section>
          ))
        ) : (
          <p className="max-w-xl text-lg text-ink-2">
            Todavía no hay diseños publicados. Escríbenos por WhatsApp y te cotizamos tu silla a medida.
          </p>
        )}
      </div>

      <ClosingCta />
    </>
  );
}
