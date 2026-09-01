import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SectionContainer } from "@/components/shared/section-container";
import { RiderGallery } from "@/features/riders/components/rider-gallery";
import { getRiderPhotos } from "@/features/riders/services/rider-photos.service";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Nuestros pilotos",
  description:
    "Motociclistas de Medellín que ya confiaron en MotoSmart Tapicería para vestir el asiento de su moto. Mira sus fotos y cotiza la tuya por WhatsApp."
};

export default async function PilotosPage() {
  const enabled = await isFeatureEnabled("riders_enabled");
  if (!enabled) redirect("/");
  const photos = await getRiderPhotos();

  return (
    <SectionContainer className="py-16">
      <h1 className="font-display text-3xl text-white sm:text-4xl">Nuestros pilotos</h1>
      <p className="mt-3 max-w-2xl text-neutral-300">
        Motos reales de clientes reales, vestidas con tapicería MotoSmart. Súbenos tu foto por WhatsApp cuando recibas la tuya.
      </p>
      <div className="mt-8">
        <RiderGallery photos={photos} />
      </div>
    </SectionContainer>
  );
}
