import type { CSSProperties } from "react";
import { SectionContainer } from "@/components/shared/section-container";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/settings";
import Link from "next/link";

// Server Component: los textos vienen de /admin > "Textos y Config".
// No lleva "use client": las animaciones data-animate* se resuelven por CSS
// (app/globals.css), no por JS.
export async function Hero() {
  const settings = await getSiteSettings();

  return (
    <SectionContainer className="pt-16 md:pt-24">
      <div
        data-animate="fade-up"
        data-animate-text
        className="flex flex-col items-center gap-6 text-center md:items-start md:text-left"
      >
        <h1
          className="max-w-4xl font-display text-display leading-tight text-white"
          style={{ "--i": 0 } as CSSProperties}
        >
          {settings.hero_tagline}
        </h1>
        <p className="max-w-2xl text-neutral-300" style={{ "--i": 1 } as CSSProperties}>
          {settings.hero_description}
        </p>
        <div
          className="flex flex-col flex-wrap items-center gap-3 sm:flex-row md:items-center"
          style={{ "--i": 2 } as CSSProperties}
        >
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/catalogo">{settings.hero_cta_text}</Link>
          </Button>
          <span className="text-sm text-neutral-300" style={{ "--i": 3 } as CSSProperties}>
            Envíos y asesoría a todo Colombia
          </span>
        </div>
      </div>
    </SectionContainer>
  );
}
