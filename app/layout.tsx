import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { WhatsAppFab } from "@/components/shared/whatsapp-fab";
import { siteConfig } from "@/config/site";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Tapiceria premium en ${siteConfig.city}`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "es_CO",
    type: "website"
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getCurrentUserRole();
  const isAdmin = canAccessAdmin(role);

  return (
    <html lang="es">
      <body>
        <Navbar isAuthenticated={Boolean(user)} isAdmin={isAdmin} />
        <main>{children}</main>
        <Footer />
        <WhatsAppFab />
      </body>
    </html>
  );
}
