"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { cx } from "@/lib/utils";
import type { Brand } from "@/types";

const chip =
  "inline-flex h-11 shrink-0 items-center rounded-lg border px-4 text-[0.9375rem] font-semibold transition-colors duration-150";

/**
 * Barra de marcas: queda pegada bajo la cabecera mientras se baja por el
 * inicio, el catálogo y cada marca. Es la forma principal de llegar a tu moto.
 */
export function BrandBar({
  brands,
  active
}: {
  brands: Array<Pick<Brand, "name" | "slug">>;
  /** Slug de la marca abierta, o "all" en el catálogo completo. */
  active?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  // En el teléfono la fila se desplaza de lado: si la marca abierta quedó
  // fuera de la vista (Yamaha es la última), se centra. Solo se mueve la fila,
  // nunca la página.
  useEffect(() => {
    const row = rowRef.current;
    const current = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !current) return;
    const start = current.offsetLeft;
    const end = start + current.offsetWidth;
    if (start >= row.scrollLeft && end <= row.scrollLeft + row.clientWidth) return;
    row.scrollLeft = Math.max(0, start - (row.clientWidth - current.offsetWidth) / 2);
  }, [active]);

  if (!brands.length) return null;

  const link = (href: string, label: string, isActive: boolean, slug?: string) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={slug ? () => void trackEvent("brand_click", { brand: slug }) : undefined}
      className={cx(chip, isActive ? "border-ink bg-ink text-bg" : "border-line-strong bg-bg text-ink hover:border-ink")}
    >
      {label}
    </Link>
  );

  return (
    <nav
      aria-label="Elige tu marca"
      className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 border-y border-line bg-bg"
    >
      <div ref={rowRef} className="bleed-row no-scrollbar relative flex items-center gap-2 overflow-x-auto py-2.5">
        <span className="shrink-0 pr-1 text-sm font-semibold text-ink-2">Elige tu marca</span>
        {link("/catalogo", "Todas", active === "all")}
        {brands.map((brand) => link(`/marca/${brand.slug}`, brand.name, active === brand.slug, brand.slug))}
      </div>
    </nav>
  );
}
