import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClosingCta } from "@/components/shared/closing-cta";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { BrandBar } from "@/features/catalog/components/brand-bar";
import { CatalogSearch } from "@/features/catalog/components/catalog-search";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { readQuery, searchDesigns } from "@/features/catalog/lib/search";
import { getBrands, getSearchableDesigns } from "@/features/catalog/services/catalog.service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

// Una página por búsqueda: no se indexa (contenido repetido del catálogo),
// pero Google sí sigue los enlaces a las marcas.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = readQuery((await searchParams).q);
  return {
    title: query ? `Buscar «${query}»` : "Buscar en el catálogo",
    robots: { index: false, follow: true }
  };
}

function countLabel(count: number) {
  return count === 1 ? "1 diseño" : `${count} diseños`;
}

export default async function BuscarPage({ searchParams }: Props) {
  const query = readQuery((await searchParams).q);

  const [enabled, brands, designs, settings] = await Promise.all([
    isFeatureEnabled("catalog_enabled", { onError: "open" }),
    getBrands(),
    getSearchableDesigns(),
    getSiteSettings()
  ]);
  if (!enabled) redirect("/");

  // "Buscar" sin escribir nada: la página queda lista para escribir (un
  // redirect aquí saldría como 200, porque catalogo/loading.tsx ya empezó a enviar).
  if (!query) {
    return (
      <>
        <PageIntro
          title="Buscar en el catálogo"
          lead="Escribe la marca o el modelo de tu moto."
          crumbs={[{ label: "Catálogo", href: "/catalogo" }, { label: "Buscar" }]}
        >
          <CatalogSearch />
        </PageIntro>
        <BrandBar brands={brands} />
      </>
    );
  }

  const results = searchDesigns(designs, query);
  const quoteHref = buildWhatsAppUrl(
    settings.whatsapp_number,
    `Hola, quiero cotizar la tapicería para mi moto: ${query.replace(/[.!?]+$/, "")}.`
  );

  return (
    <>
      <PageIntro
        title={`Resultados para «${query}»`}
        lead={results.length ? countLabel(results.length) : "No encontramos diseños publicados con ese nombre."}
        crumbs={[{ label: "Catálogo", href: "/catalogo" }, { label: "Buscar" }]}
      >
        <CatalogSearch query={query} />
      </PageIntro>
      <BrandBar brands={brands} />

      <div className={cn(containerClasses, "py-10 md:py-12")}>
        {results.length ? (
          <DesignGrid designs={results} priorityCount={2} />
        ) : (
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-3xl">La hacemos a la medida de tu moto</h2>
            <p className="mt-3 text-lg text-ink-2">
              Que no aparezca aquí no quiere decir que no la hagamos. Te cotizamos la silla de tu moto por WhatsApp, o
              elige tu marca arriba para ver lo que ya hemos hecho.
            </p>
            <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
              <WhatsAppLink href={quoteHref} source="busqueda" reference={query}>
                <WhatsAppIcon />
                Cotizar por WhatsApp
              </WhatsAppLink>
            </Button>
          </div>
        )}
      </div>

      {results.length ? <ClosingCta /> : null}
    </>
  );
}
