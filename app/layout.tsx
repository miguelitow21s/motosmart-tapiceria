import type { Metadata } from "next";
import { Orbitron, Sora } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { WhatsAppFab } from "@/components/shared/whatsapp-fab";
import { siteConfig } from "@/config/site";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";

// Pesos verificados contra el uso real de clases font-* en el repo: Sora
// cubre texto base (400), font-medium (500) y font-semibold (600); Orbitron
// solo se usa en h1-h4 sin peso explicito (hereda 400, que el propio
// navegador ya mapeaba a 500 con el @import anterior), asi que basta 500.
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans"
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-display"
});

// Metadata editable desde /admin > "Textos y Config" (claves meta_title y
// meta_description). No la vuelvas a quemar aqui.
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
  const isAdmin = canAccessAdmin(role);
  const whatsappHref = buildWhatsAppUrl(settings.whatsapp_number, settings.whatsapp_default_message);

  return (
    <html lang="es" className={`${sora.variable} ${orbitron.variable}`}>
      <body>
        <Navbar isAuthenticated={Boolean(user)} isAdmin={isAdmin} />
        {/* pb-24: deja aire para que el boton flotante de WhatsApp no tape
            el ultimo CTA de la pagina en movil. */}
        <main className="pb-24">{children}</main>
        <Footer />
        <WhatsAppFab href={whatsappHref} />
      </body>
    </html>
  );
}
