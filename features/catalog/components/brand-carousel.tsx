"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import type { Brand } from "@/types";

export function BrandCarousel({ brands }: { brands: Brand[] }) {
  if (!brands.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-neutral-200">
        Aun no hay marcas publicadas. Escribenos y te guiamos para subir tus primeros diseños.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-animate-stagger>
      {brands.map((brand, idx) => (
        <div key={brand.id} style={{ "--i": idx } as CSSProperties}>
          <Link
            href={`/marca/${brand.slug}`}
            onClick={() => trackEvent("brand_click", { brand: brand.slug })}
            className="block rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-transparent p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-card"
          >
            <h3 className="font-display text-lg text-white">{brand.name}</h3>
            <p className="mt-2 text-sm text-neutral-300">{brand.description}</p>
          </Link>
        </div>
      ))}
    </div>
  );
}
