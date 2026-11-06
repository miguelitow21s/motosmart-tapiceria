"use client";

import { useMemo } from "react";
import { sortByCarouselOrder } from "@/lib/carousel-order";
import { useAdminStore } from "@/features/admin/store/admin-data";

/** Fotos del carrusel en el mismo orden que ve el público (/api/carousel usa la misma regla). */
export function useCarouselImages() {
  const images = useAdminStore((state) => state.images);
  const order = useAdminStore((state) => state.carouselOrder);
  return useMemo(() => sortByCarouselOrder(images.filter((image) => image.is_carousel), order), [images, order]);
}

/** Nombre de cada diseño y marca por id, para listas que solo guardan el id. */
export function useNameLookups() {
  const designs = useAdminStore((state) => state.designs);
  const brands = useAdminStore((state) => state.brands);
  return useMemo(
    () => ({
      design: new Map(designs.map((design) => [design.id, design])),
      brand: new Map(brands.map((brand) => [brand.id, brand]))
    }),
    [designs, brands]
  );
}
