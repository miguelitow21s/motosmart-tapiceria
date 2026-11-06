import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { containerClasses } from "@/components/shared/section";
import { buildDemoSeed, type DemoCase } from "@/features/admin/demo/demo-seed";
import { getActiveDesigns, getBrands, getCarouselSlides } from "@/features/catalog/services/catalog.service";
import { getRiderPhotos } from "@/features/riders/services/rider-photos.service";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";
import { DemoClient } from "./demo-client";

/*
  Demostración del panel para revisarlo sin sesión y sin tocar la base de
  datos: lee lo público de la tienda (solo lectura) y todo lo que se cambie
  vive en la memoria del navegador. Solo existe con ADMIN_DEMO=1 en el
  servidor; en producción esta ruta responde 404.

  ?caso=extremo  datos al límite (break-ui)
  ?caso=vacio    tienda recién creada
*/

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Panel (demostración)", robots: { index: false, follow: false } };

const CASES: DemoCase[] = ["normal", "extremo", "vacio"];

export default async function PanelDemoPage({ searchParams }: { searchParams: Promise<{ caso?: string }> }) {
  if (process.env.ADMIN_DEMO !== "1") notFound();

  const { caso } = await searchParams;
  const demoCase = CASES.includes(caso as DemoCase) ? (caso as DemoCase) : "normal";
  const [brands, designs, slides, riders, settings] = await Promise.all([
    getBrands(),
    getActiveDesigns(),
    getCarouselSlides(),
    getRiderPhotos(),
    getSiteSettings()
  ]);

  const seed = buildDemoSeed(
    {
      brands,
      designs,
      slides,
      riders,
      settings: Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, String(value ?? "")]))
    },
    demoCase
  );

  return (
    <div className={cn(containerClasses, "pt-5 pb-28 lg:pt-8 lg:pb-16")}>
      <DemoClient seed={seed} />
    </div>
  );
}
