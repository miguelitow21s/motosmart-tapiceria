import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClosingCta } from "@/components/shared/closing-cta";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { BrandBar } from "@/features/catalog/components/brand-bar";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { getActiveDesigns, getBrands, sortForStore } from "@/features/catalog/services/catalog.service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Catálogo de tapicería para moto por marca",
  description:
    "Diseños de tapicería para moto organizados por marca, con precio de referencia. Cotiza tu silla por WhatsApp en Medellín."
};

/** Cuántas sillas de cada marca se muestran aquí antes de mandar a la página de la marca. */
const PER_BRAND = 4;

export default async function CatalogoPage() {
  const enabled = await isFeatureEnabled("catalog_enabled");
  if (!enabled) redirect("/");
  const [brands, designs] = await Promise.all([getBrands(), getActiveDesigns()]);

  const groups = brands
    .map((brand) => ({ brand, designs: sortForStore(designs.filter((design) => design.brand_id === brand.id)) }))
    .filter((group) => group.designs.length > 0);

  return (
    <>
      <PageIntro
        title="Catálogo"
        lead="Fundas y tapicería para moto por marca, con precio de referencia. Elige tu marca o baja para ver todo."
      />
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
                <DesignGrid designs={brandDesigns.slice(0, PER_BRAND)} showBrand={false} priorityCount={index === 0 ? 2 : 0} />
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
