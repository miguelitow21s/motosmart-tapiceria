import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClosingCta } from "@/components/shared/closing-cta";
import { ConfiguratorSection, SEAT_POSTER } from "@/features/configurator/components/configurator-section";
import { isCustomizerEnabled } from "@/lib/feature-flags";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Arma tu silla",
    description:
      "Elige los colores del centro, los costados y la costura de la silla de tu moto, mírala en 3D y cotízala por WhatsApp con MotoSmart Tapicería.",
    path: "/arma-tu-silla",
    image: SEAT_POSTER,
    imageAlt: "Silla de moto en 3D con rombos y costura de color"
  });
}

export default async function ArmaTuSillaPage() {
  if (!(await isCustomizerEnabled({ onError: "open" }))) redirect("/");
  return (
    <>
      <ConfiguratorSection headingLevel="h1" />
      <ClosingCta />
    </>
  );
}
