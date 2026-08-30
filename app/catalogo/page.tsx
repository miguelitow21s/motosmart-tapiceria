import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SectionContainer } from "@/components/shared/section-container";
import { BrandCarousel } from "@/features/catalog/components/brand-carousel";
import { getBrands } from "@/features/catalog/services/catalog.service";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Catálogo de tapicería para moto por marca",
  description:
    "Explora diseños de tapicería para moto organizados por marca y cotiza tu funda a medida por WhatsApp en Medellín."
};

export default async function CatalogoPage() {
  const enabled = await isFeatureEnabled("catalog_enabled");
  if (!enabled) redirect("/");
  const brands = await getBrands();

  return (
    <SectionContainer className="py-16">
      <h1 className="font-display text-3xl text-white sm:text-4xl">Catálogo por marcas</h1>
      <p className="mt-3 text-neutral-300">Selecciona tu marca y explora diseños disponibles.</p>
      <div className="mt-8">
        <BrandCarousel brands={brands} />
      </div>
    </SectionContainer>
  );
}
