import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClosingCta } from "@/components/shared/closing-cta";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { BrandBar } from "@/features/catalog/components/brand-bar";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { getBrandBySlug, getBrands, getDesignsByBrand } from "@/features/catalog/services/catalog.service";
import { cn } from "@/lib/utils";

export const revalidate = 0;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: "Marca no encontrada" };
  return {
    title: `Tapicería para moto ${brand.name}`,
    description:
      brand.description?.trim() ||
      `Diseños de tapicería para moto ${brand.name} con precio de referencia. Cotiza tu silla por WhatsApp en Medellín.`,
    alternates: { canonical: `/marca/${brand.slug}` }
  };
}

export default async function MarcaPage({ params }: Props) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const [brands, designs] = await Promise.all([getBrands(), getDesignsByBrand(brand)]);
  const count = designs.length === 1 ? "1 diseño" : `${designs.length} diseños`;

  return (
    <>
      <PageIntro
        title={brand.name}
        crumbs={[{ label: "Catálogo", href: "/catalogo" }, { label: brand.name }]}
        lead={brand.description?.trim() || undefined}
      >
        {designs.length ? <p className="mt-2 text-sm text-ink-3">{count}</p> : null}
      </PageIntro>
      <BrandBar brands={brands} active={brand.slug} />

      <div className={cn(containerClasses, "py-8 md:py-10")}>
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
      </div>

      <ClosingCta />
    </>
  );
}
