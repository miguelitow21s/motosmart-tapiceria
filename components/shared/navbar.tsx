"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { AdminSessionActions } from "@/components/shared/admin-session-actions";
import { Logo } from "@/components/shared/logo";
import { containerClasses } from "@/components/shared/section";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { cx } from "@/lib/utils";

const publicLinks = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/pilotos", label: "Pilotos" },
  { href: "/sobre-nosotros", label: "Nosotros" },
  { href: "/contactanos", label: "Contacto" }
];

// En el panel, las secciones viven en su propia navegación (lateral o barra
// inferior): la cabecera solo lleva el logo, "Ver tienda" y la sesión.
function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/panel-demo");
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // Una marca es parte del catálogo.
  if (href === "/catalogo" && pathname.startsWith("/marca/")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/*
  La tienda se sirve desde caché (igual para todos), así que el servidor no
  sabe quién mira. El enlace al panel se decide aquí, con la cookie de sesión
  de Supabase (no es httpOnly). Solo muestra un enlace: quién entra al panel
  lo sigue decidiendo middleware.ts con el rol guardado en la base.
*/
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.0)?=/;
const noSubscribe = () => () => {};

function useHasSession() {
  return useSyncExternalStore(
    noSubscribe,
    () => SESSION_COOKIE.test(document.cookie),
    () => false
  );
}

export function Navbar({ whatsappHref }: { whatsappHref: string }) {
  const isAuthenticated = useHasSession();
  const pathname = usePathname();
  const inAdmin = isAdminPath(pathname);
  const links = publicLinks;
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Menú abierto: la página de atrás no se desplaza ni recibe foco (Tab y el
  // lector de pantalla se quedan en el menú), Escape lo cierra y, si la
  // pantalla se ensancha a escritorio, se cierra solo.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const behind = [document.getElementById("contenido"), document.querySelector("body > footer")].filter(
      (node): node is HTMLElement => node instanceof HTMLElement
    );
    for (const node of behind) node.inert = true;
    firstLinkRef.current?.focus();

    const desktop = window.matchMedia("(min-width: 48rem)");
    const close = () => setOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onResize = () => {
      if (desktop.matches) close();
    };
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    return () => {
      root.style.overflow = previousOverflow;
      for (const node of behind) node.inert = false;
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <header className="vt-chrome-top sticky top-0 z-50 bg-header pt-[env(safe-area-inset-top)] text-white [--focus:#fff]">
      <div className={cx(containerClasses, "flex h-14 items-center gap-2")}>
        <Logo priority />

        {inAdmin ? (
          <span className="ml-1 hidden border-l border-white/25 pl-3 text-[0.9375rem] font-medium text-white/75 sm:inline">Panel</span>
        ) : null}

        <nav aria-label="Principal" className={cx("ml-6 hidden", !inAdmin && "md:block")}>
          <ul className="flex items-center gap-1">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "relative inline-flex h-11 items-center rounded-md px-3 text-[0.9375rem] font-medium transition-colors duration-150",
                      active
                        ? // Subrayado blanco: el rojo queda para acciones y precios en promoción.
                          "text-white after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:bg-white"
                        : "text-white/75 hover:text-white"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {inAdmin ? (
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex h-11 items-center rounded-md px-3 text-[0.9375rem] font-medium text-white/75 transition-colors duration-150 hover:text-white"
              >
                Ver tienda
              </Link>
              {/* En el teléfono, cerrar sesión está en "Más" de la barra inferior del panel. */}
              <div className="hidden lg:block">
                <AdminSessionActions compact />
              </div>
            </div>
          ) : (
            <>
              {isAuthenticated ? (
                <Link
                  href="/admin"
                  className="hidden h-11 items-center rounded-md px-3 text-[0.9375rem] font-medium text-white/75 hover:text-white md:inline-flex"
                >
                  Panel
                </Link>
              ) : null}
              <Button asChild size="sm" className="hidden md:inline-flex">
                <WhatsAppLink href={whatsappHref} source="cabecera">
                  <WhatsAppIcon />
                  Cotizar por WhatsApp
                </WhatsAppLink>
              </Button>
              <Button asChild size="icon" className="md:hidden">
                <WhatsAppLink href={whatsappHref} source="cabecera" aria-label="Escribir por WhatsApp">
                  <WhatsAppIcon />
                </WhatsAppLink>
              </Button>
            </>
          )}

          <button
            ref={menuButtonRef}
            type="button"
            hidden={inAdmin}
            className="inline-flex size-11 items-center justify-center rounded-lg text-white transition-[background-color,scale] duration-150 ease-(--ease-out) hover:bg-white/10 active:scale-[0.97] md:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
          >
            {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
          </button>
        </div>
      </div>

      {/* Menú del teléfono: una hoja a pantalla completa bajo la barra negra. */}
      {!inAdmin ? (
        <div
          id="menu-movil"
          inert={!open}
          className={cx(
            "fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] bottom-0 z-40 overflow-y-auto overscroll-contain bg-bg pb-[env(safe-area-inset-bottom)] text-ink [--focus:var(--ink)] md:hidden",
            "transition-[opacity,translate] duration-[220ms] ease-(--ease-out)",
            open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
          )}
        >
          <nav aria-label="Menú" className={cx(containerClasses, "py-4")}>
            <ul className="divide-y divide-line border-b border-line">
              {links.map((link, index) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      ref={index === 0 ? firstLinkRef : undefined}
                      href={link.href}
                      onClick={closeMenu}
                      aria-current={active ? "page" : undefined}
                      className="type-display flex h-16 items-center justify-between text-2xl"
                    >
                      <span className={cx(active && "underline decoration-current decoration-2 underline-offset-8")}>{link.label}</span>
                      <ChevronRight aria-hidden="true" className="size-5 text-ink-3" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 grid gap-3">
              <Button asChild size="lg" className="w-full">
                <WhatsAppLink href={whatsappHref} source="menu" onClick={closeMenu}>
                  <WhatsAppIcon />
                  Cotizar por WhatsApp
                </WhatsAppLink>
              </Button>
              {isAuthenticated ? (
                <>
                  <Button asChild variant="secondary" size="lg" className="w-full">
                    <Link href="/admin" onClick={closeMenu}>
                      Ir al panel
                    </Link>
                  </Button>
                  <AdminSessionActions />
                </>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
