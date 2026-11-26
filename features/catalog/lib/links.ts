/** Página propia de un diseño: va bajo su marca porque el slug solo es único dentro de ella. */
export function designHref(design: { brand_slug: string; slug: string }) {
  return `/marca/${design.brand_slug}/${design.slug}`;
}
