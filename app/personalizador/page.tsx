import { redirect } from "next/navigation";
import { SectionContainer } from "@/components/shared/section-container";
import { CustomizerSimulator } from "@/features/customizer/components/customizer-simulator";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function PersonalizadorPage() {
  const enabled = await isFeatureEnabled("customizer_enabled");
  if (!enabled) redirect("/");

  return (
    <SectionContainer className="py-16">
      <h1 className="font-display text-4xl text-white">Personalizador avanzado</h1>
      <p className="mt-3 text-neutral-300">Configura cada detalle y envia la cotizacion a WhatsApp.</p>
      <div className="mt-8">
        <CustomizerSimulator />
      </div>
    </SectionContainer>
  );
}
