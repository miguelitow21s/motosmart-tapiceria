import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { HideOnAdmin } from "@/components/shared/hide-on-admin";
import { siteConfig } from "@/config/site";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";

// Archivo variable con eje de ancho: un solo archivo da los títulos
// condensados (font-stretch 75%) y el texto en ancho normal. Recortada a lo
// que se usa (ver app/fonts/README.md): 58 kB en vez de 90 kB.
const archivo = localFont({
  src: "./fonts/archivo-latin-var.woff2",
  weight: "400 800",
  style: "normal",
  display: "swap",
  variable: "--font-archivo",
  // Arial ajustada a las métricas de Archivo: el texto no salta al cargar.
  adjustFontFallback: "Arial",
  declarations: [{ prop: "font-stretch", value: "75% 100%" }]
});

// La barra superior es negra (el logo solo se lee sobre negro): la barra de
// estado del teléfono toma el mismo color.
export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Con el teclado abierto, el diseño se ajusta al alto que queda: la barra
  // de Guardar de las hojas del panel no queda tapada en Android.
  interactiveWidget: "resizes-content"
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
    // Lo heredan las páginas sin tarjeta propia (login, 404…). Sin `url`: con
    // ella, todas se compartían como si fueran el inicio (ver lib/seo.ts).
    openGraph: {
      title: settings.meta_title,
      description: settings.meta_description,
      siteName: settings.business_name,
      locale: "es_CO",
      type: "website",
      images: [{ url: "/logo-motosmart.png", alt: settings.business_name }]
    }
  };
}

/*
  La tienda se genera una vez y se sirve desde caché; se regenera cada 5
  minutos y, al guardar algo en el panel, en el acto (lib/store-cache.ts).
  Por eso el layout no lee la sesión: con cookies, cada visita renderizaba la
  página entera. El panel (/admin) sigue siendo dinámico por su cuenta.
  Una promoción programada empieza o termina con hasta 5 minutos de margen.
*/
export const revalidate = 300;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const whatsappHref = buildWhatsAppUrl(settings.whatsapp_number, settings.whatsapp_default_message);

  return (
    <html lang="es-CO" className={archivo.variable}>
      <body>
        <a
          href="#contenido"
          // Blanco sobre la cabecera negra y por encima de ella (z-50). Fuera de
          // pantalla hasta recibir foco; sin sr-only, cuyo padding:0 al
          // enfocarse pisaría el px-4 py-3.
          className="fixed top-2 left-2 z-90 -translate-y-[200%] rounded-lg bg-bg px-4 py-3 font-semibold text-ink shadow-float focus:translate-y-0"
        >
          Saltar al contenido
        </a>
        {/* WhatsApp vive en la cabecera fija (siempre a mano), así que ya no
            hay botón flotante tapando fotos y precios. */}
        <Navbar whatsappHref={whatsappHref} />
        <main id="contenido" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <HideOnAdmin>
          <Footer />
        </HideOnAdmin>
      </body>
    </html>
  );
}
