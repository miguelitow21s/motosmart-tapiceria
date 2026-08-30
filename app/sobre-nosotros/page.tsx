import type { Metadata } from "next";
import { SectionContainer } from "@/components/shared/section-container";
import { Card } from "@/components/ui/card";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description: "Conoce a MotoSmart, tapicería para moto en Medellín, y por qué elegir nuestros diseños."
};

export default async function SobreNosotrosPage() {
  const settings = await getSiteSettings();

  return (
    <SectionContainer className="py-10 sm:py-14 md:py-20">
      <h1 className="font-display text-3xl text-white sm:text-4xl">Sobre nosotros</h1>
      <Card className="mt-8">
        <p className="text-neutral-200">{settings.about_description}</p>
      </Card>
    </SectionContainer>
  );
}
