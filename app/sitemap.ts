import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getActiveDesigns, getBrands } from "@/features/catalog/services/catalog.service";
import { isFeatureEnabled } from "@/lib/feature-flags";

/**
 * Solo páginas que Google debe indexar: sin /login (bloqueada en robots.txt) y
 * con cada marca que tiene diseños publicados, que es por donde llega quien
 * busca "tapicería moto Yamaha". Sin lastModified: no hay una fecha real por
 * página y la del build diría que todo cambió hoy.
 */
// Se regenera como la tienda: una marca nueva entra al sitemap en minutos, no en el próximo despliegue.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brands, designs, catalogOn, ridersOn] = await Promise.all([
    getBrands(),
    getActiveDesigns(),
    isFeatureEnabled("catalog_enabled"),
    isFeatureEnabled("riders_enabled")
  ]);
  const withDesigns = new Set(designs.map((design) => design.brand_id));

  const paths = [
    "",
    ...(catalogOn ? ["/catalogo"] : []),
    ...brands.filter((brand) => withDesigns.has(brand.id)).map((brand) => `/marca/${brand.slug}`),
    ...(ridersOn ? ["/pilotos"] : []),
    "/sobre-nosotros",
    "/contactanos"
  ];

  return paths.map((path) => ({ url: `${siteConfig.url}${path}` }));
}
