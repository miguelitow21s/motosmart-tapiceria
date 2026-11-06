import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClosingCta } from "@/components/shared/closing-cta";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { RiderGallery } from "@/features/riders/components/rider-gallery";
import { getRiderPhotos } from "@/features/riders/services/rider-photos.service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

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
    <>
      <PageIntro
        title="Nuestros pilotos"
        lead="Motos reales de clientes reales, con su silla MotoSmart. Cuando recibas la tuya, mándanos la foto por WhatsApp."
      />
      <div className={cn(containerClasses, "pt-2 pb-12 md:pb-16")}>
        <RiderGallery photos={photos} />
      </div>
      <ClosingCta />
    </>
  );
}
