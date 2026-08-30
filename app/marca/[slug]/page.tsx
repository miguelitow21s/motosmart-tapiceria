import { SectionContainer } from "@/components/shared/section-container";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { getDesignsByBrandSlug } from "@/features/catalog/services/catalog.service";

export const revalidate = 0;

export default async function MarcaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { brand, designs } = await getDesignsByBrandSlug(slug);

  return (
    <SectionContainer className="py-16">
      <h1 className="font-display text-3xl text-white sm:text-4xl">Diseños de {brand?.name ?? slug}</h1>
      <div className="mt-8">
        <DesignGrid designs={designs} />
      </div>
    </SectionContainer>
  );
}
