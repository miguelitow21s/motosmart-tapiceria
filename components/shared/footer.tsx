import Link from "next/link";
import { ContactDetails } from "@/components/shared/contact-details";
import { Logo } from "@/components/shared/logo";
import { containerClasses } from "@/components/shared/section";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

const shopLinks = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/pilotos", label: "Pilotos" },
  { href: "/sobre-nosotros", label: "Nosotros" },
  { href: "/contactanos", label: "Contacto" }
];

// Pie negro, igual que la cabecera: el logo solo se lee sobre negro.
export async function Footer() {
  const settings = await getSiteSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-header pb-[env(safe-area-inset-bottom)] text-white/70 [--focus:#fff] [--line-strong:rgb(255_255_255/0.4)]">
      <div className={cn(containerClasses, "grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr] md:py-14")}>
        <div>
          <Logo />
          <p className="mt-4 max-w-xs">Tapicería para moto en Medellín. Cotizaciones por WhatsApp.</p>
        </div>

        <nav aria-labelledby="pie-tienda">
          <h2 id="pie-tienda" className="text-lg text-white">
            Tienda
          </h2>
          <ul className="mt-3">
            {shopLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="link-underline inline-flex min-h-11 items-center hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-lg text-white">Contacto</h2>
          <ContactDetails tone="dark" className="mt-4" />
        </div>
      </div>

      <div className="border-t border-white/15">
        <div
          className={cn(
            containerClasses,
            "flex flex-col gap-1 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <p>
            © {year} {settings.business_name}
          </p>
          {/* Con sesión entra directo al panel; sin ella, middleware.ts lleva al login. */}
          <Link href="/admin" prefetch={false} className="link-underline inline-flex min-h-11 items-center hover:text-white">
            Acceso administrador
          </Link>
        </div>
      </div>
    </footer>
  );
}
