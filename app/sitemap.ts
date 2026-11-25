import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getStoreDesigns, getBrands } from "@/features/catalog/services/catalog.service";
import { isCustomizerEnabled, isFeatureEnabled } from "@/lib/feature-flags";

/**
 * Solo páginas que Google debe indexar: sin /login (bloqueada en robots.txt) y
 * con cada marca que tiene diseños publicados, que es por donde llega quien
 * busca "tapicería moto Yamaha". Sin lastModified: no hay una fecha real por
 * página y la del build diría que todo cambió hoy.
 */
// Se regenera como la tienda: una marca nueva entra al sitemap en minutos, no en el próximo despliegue.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brands, designs, catalogOn, ridersOn, customizerOn] = await Promise.all([
    getBrands(),
    getStoreDesigns(),
    isFeatureEnabled("catalog_enabled"),
    isFeatureEnabled("riders_enabled"),
    isCustomizerEnabled()
  ]);
  const withDesigns = new Set(designs.map((design) => design.brand_id));

  const paths = [
    "",
    ...(catalogOn ? ["/catalogo"] : []),
    ...brands.filter((brand) => withDesigns.has(brand.id)).map((brand) => `/marca/${brand.slug}`),
    ...(customizerOn ? ["/arma-tu-silla"] : []),
    ...(ridersOn ? ["/pilotos"] : []),
    "/sobre-nosotros",
    "/contactanos"
  ];

  return paths.map((path) => ({ url: `${siteConfig.url}${path}` }));
}
