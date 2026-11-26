import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClosingCta } from "@/components/shared/closing-cta";
import { PageIntro } from "@/components/shared/page-intro";
import { containerClasses } from "@/components/shared/section";
import { RiderGallery } from "@/features/riders/components/rider-gallery";
import { getRiderPhotos } from "@/features/riders/services/rider-photos.service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
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
  const [enabled, photos, settings] = await Promise.all([
    isFeatureEnabled("riders_enabled", { onError: "open" }),
    getRiderPhotos(),
    getSiteSettings()
  ]);
  if (!enabled) redirect("/");
  const shareHref = buildWhatsAppUrl(
    settings.whatsapp_number,
    "Hola MotoSmart, les mando la foto de mi moto con la silla para la página de Pilotos."
  );

  return (
    <>
      <PageIntro
        title="Nuestros pilotos"
        lead="Motos reales de clientes reales, con su silla MotoSmart. Cuando recibas la tuya, mándanos la foto por WhatsApp."
        facts={photos.length ? [{ value: photos.length, label: photos.length === 1 ? "piloto con su silla" : "pilotos con su silla" }] : undefined}
      />
      {/* Galería en el escenario negro de la cabecera: las fotos de los pilotos
          son de noche y de taller, y sobre negro se ven como una exposición. */}
      <div data-theme="dark">
        <div className={cn(containerClasses, "pt-2 pb-14 md:pb-20")}>
          <RiderGallery photos={photos} shareHref={shareHref} />
        </div>
      </div>
      <ClosingCta />
    </>
  );
}
