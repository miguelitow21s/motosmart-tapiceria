import { Hero } from "@/components/shared/hero";
import { SectionContainer } from "@/components/shared/section-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeatureCarousel } from "@/components/shared/feature-carousel";
import { BrandCarousel } from "@/features/catalog/components/brand-carousel";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { getBrands, getFeaturedDesigns } from "@/features/catalog/services/catalog.service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { Package, ShieldCheck, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import Link from "next/link";

export default async function HomePage() {
  const [checkoutEnabled, brands, featuredDesigns] = await Promise.all([
    isFeatureEnabled("checkout_enabled"),
    getBrands(),
    getFeaturedDesigns()
  ]);

  return (
    <>
      <Hero />

      <SectionContainer className="py-8">
        <h2 className="font-display text-2xl text-white sm:text-3xl">Elige tu marca</h2>
        <p className="mt-2 text-neutral-300">Entra directo al catálogo de tu moto.</p>
        <div className="mt-6">
          <BrandCarousel brands={brands} />
        </div>
      </SectionContainer>

      {featuredDesigns.length ? (
        <SectionContainer className="py-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl text-white sm:text-3xl">Nuestras sillas</h2>
              <p className="mt-2 text-neutral-300">Precio y diseño real. Toca una y cotiza por WhatsApp al instante.</p>
            </div>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href="/catalogo">Ver catálogo completo</Link>
            </Button>
          </div>
          <div className="mt-6">
            <DesignGrid designs={featuredDesigns} />
          </div>
        </SectionContainer>
      ) : null}

      <SectionContainer>
        <FeatureCarousel />
      </SectionContainer>
      <SectionContainer className="py-12">
        <div
          className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
          data-animate="fade-up"
        >
          <h2 className="font-display text-3xl text-white">Servicios de tapicería y personalización</h2>
          <p className="mt-3 max-w-3xl text-neutral-300">
            Diseños a medida, materiales premium y acabados listos para instalar. Pide tu estilo y lo fabricamos.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/catalogo">Ver catálogo</Link>
            </Button>
            {checkoutEnabled ? (
              <Button variant="secondary" asChild>
                <Link href="/checkout">Agendar instalación</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </SectionContainer>

      <SectionContainer>
        <div className="grid gap-4 md:grid-cols-3" data-animate-stagger>
          <Card className="h-full space-y-3" style={{ "--i": 0 } as CSSProperties}>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl text-white">Materiales premium</h3>
            <p className="text-neutral-300">Cuero, antideslizantes y espumas de alta densidad para uso diario y touring.</p>
          </Card>
          <Card className="h-full space-y-3" style={{ "--i": 1 } as CSSProperties}>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl text-white">Diseño a medida</h3>
            <p className="text-neutral-300">Costuras, colores y texturas personalizadas según tu modelo y estilo.</p>
          </Card>
          <Card className="h-full space-y-3" style={{ "--i": 2 } as CSSProperties}>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl text-white">Entrega segura</h3>
            <p className="text-neutral-300">Envíos protegidos y lista de chequeo antes de despachar tu asiento.</p>
          </Card>
        </div>
      </SectionContainer>
    </>
  );
}
