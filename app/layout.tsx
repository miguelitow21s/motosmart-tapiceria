import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { siteConfig } from "@/config/site";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";

// Archivo variable con eje de ancho: un solo archivo da los títulos
// condensados (font-stretch 75%) y el texto en ancho normal.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo"
});

// La barra superior es negra (el logo solo se lee sobre negro): la barra de
// estado del teléfono toma el mismo color.
export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1
};

// Metadata editable desde /admin > "Textos y Config" (claves meta_title y
// meta_description). No la vuelvas a quemar aquí.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: settings.meta_title,
      template: `%s | ${settings.business_name}`
    },
    description: settings.meta_description,
    openGraph: {
      title: settings.meta_title,
      description: settings.meta_description,
      url: siteConfig.url,
      siteName: settings.business_name,
      locale: "es_CO",
      type: "website"
    }
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ user, role }, settings] = await Promise.all([getCurrentUserRole(), getSiteSettings()]);
  // El enlace al panel solo se ofrece a quien puede entrar.
  const canOpenPanel = Boolean(user) && canAccessAdmin(role);
  const whatsappHref = buildWhatsAppUrl(settings.whatsapp_number, settings.whatsapp_default_message);

  return (
    <html lang="es-CO" className={archivo.variable}>
      <body>
        <a
          href="#contenido"
          className="sr-only z-50 rounded-lg bg-ink px-4 py-3 font-semibold text-bg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Saltar al contenido
        </a>
        {/* WhatsApp vive en la cabecera fija (siempre a mano), así que ya no
            hay botón flotante tapando fotos y precios. */}
        <Navbar isAuthenticated={canOpenPanel} whatsappHref={whatsappHref} />
        <main id="contenido" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer isAuthenticated={canOpenPanel} />
      </body>
    </html>
  );
}
