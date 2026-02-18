import { SectionContainer } from "@/components/shared/section-container";
import { Card } from "@/components/ui/card";

export default function SobreNosotrosPage() {
  return (
    <SectionContainer className="py-16">
      <h1 className="font-display text-4xl text-white">Sobre nosotros</h1>
      <Card className="mt-8">
        <p className="text-neutral-200">
          Somos un equipo enfocado en tapiceria premium para motos. Combinamos materiales de alto rendimiento, procesos tecnicos y diseno contemporaneo para crear productos duraderos y unicos.
        </p>
      </Card>
    </SectionContainer>
  );
}
