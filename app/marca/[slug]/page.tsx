import { SectionContainer } from "@/components/shared/section-container";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { getDesignsByBrandSlug } from "@/features/catalog/services/catalog.service";

export const revalidate = 0;

export default async function MarcaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const designs = await getDesignsByBrandSlug(slug);

  return (
    <SectionContainer className="py-16">
      <h1 className="font-display text-4xl text-white">Disenos de {slug}</h1>
      <div className="mt-8">
        <DesignGrid designs={designs} />
      </div>
    </SectionContainer>
  );
}
