import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const customizerEnabled = await isFeatureEnabled("customizer_enabled");
  const routes = [
    "",
    "/catalogo",
    "/sobre-nosotros",
    "/contactanos",
    "/login"
  ];

  if (customizerEnabled) {
    routes.push("/personalizador");
  }

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8
  }));
}
