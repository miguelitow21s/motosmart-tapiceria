import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClosingCta } from "@/components/shared/closing-cta";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { RiderGallery } from "@/features/riders/components/rider-gallery";
import { getRiderPhotos } from "@/features/riders/services/rider-photos.service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/cn";


export async function generateMetadata(): Promise<Metadata> {
  const photos = await getRiderPhotos();
  const photo = photos[0];
  return pageMetadata({
    title: "Nuestros pilotos",
    description:
      "Motociclistas de Medellín que ya confiaron en MotoSmart Tapicería para vestir el asiento de su moto. Mira sus fotos y cotiza la tuya por WhatsApp.",
    path: "/pilotos",
    image: photo?.storage_path,
    imageAlt: photo ? `${photo.rider_name} en su moto con la silla de MotoSmart` : undefined
  });
}

export default async function PilotosPage() {
  const [enabled, photos] = await Promise.all([isFeatureEnabled("riders_enabled", { onError: "open" }), getRiderPhotos()]);
  if (!enabled) redirect("/");

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
