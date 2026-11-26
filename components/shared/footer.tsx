import Link from "next/link";
import { ContactDetails } from "@/components/shared/contact-details";
import { Logo } from "@/components/shared/logo";
import { containerClasses } from "@/components/shared/section";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

const shopLinks = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/arma-tu-silla", label: "Arma tu silla" },
  { href: "/pilotos", label: "Pilotos" },
  { href: "/sobre-nosotros", label: "Nosotros" },
  { href: "/contactanos", label: "Contacto" }
];

// Pie negro, igual que la cabecera: el logo solo se lee sobre negro.
export async function Footer({ customizerOn }: { customizerOn: boolean }) {
  const settings = await getSiteSettings();
  const wordmark = settings.business_name.trim().split(/\s+/)[0] ?? "";
  const year = new Date().getFullYear();
  // "Arma tu silla" solo existe con su módulo encendido.
  const links = customizerOn ? shopLinks : shopLinks.filter((link) => link.href !== "/arma-tu-silla");

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
            {links.map((link) => (
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

      {/* El nombre a lo ancho del pie, como firma. Decoración: el nombre ya está en el logo y abajo. */}
      <div aria-hidden="true" className={cn(containerClasses, "pt-4 pb-10 select-none md:pt-6 md:pb-14")}>
        <p
          className="type-display text-center leading-[0.9] tracking-[-0.02em] whitespace-nowrap text-white/90 uppercase"
          // Cada letra mide ~0,58 em: el tamaño sale del largo del nombre, sin partirse; tope de 46 rem de ancho para que acompañe y no tape.
          style={{ fontSize: `calc(min(100vw - 4rem, 46rem) / ${(Math.max(wordmark.length, 4) * 0.6).toFixed(2)})` }}
        >
          {wordmark}
        </p>
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
