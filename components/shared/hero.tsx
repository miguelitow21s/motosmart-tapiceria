"use client";

import type { CSSProperties } from "react";
import { SectionContainer } from "@/components/shared/section-container";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Hero() {
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
          Tapiceria de moto premium a tu medida
        </h1>
        <p className="max-w-2xl text-neutral-300" style={{ "--i": 1 } as CSSProperties}>
          Asientos hechos a mano, materiales de alto agarre y terminados con detalle profesional para que tu moto se vea y se sienta mejor.
        </p>
        <div
          className="flex flex-col flex-wrap items-center gap-3 sm:flex-row md:items-center"
          style={{ "--i": 2 } as CSSProperties}
        >
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/catalogo">Ver catalogo</Link>
          </Button>
          <Button variant="secondary" asChild size="lg" className="w-full sm:w-auto">
            <Link href="/personalizador">Pedir un diseño</Link>
          </Button>
          <span className="text-sm text-neutral-400" style={{ "--i": 3 } as CSSProperties}>
            Envíos y asesoría a todo Colombia
          </span>
        </div>
      </div>
    </SectionContainer>
  );
}
