"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogoGlow } from "@/components/shared/logo-glow";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catalogo" },
  { href: "/personalizador", label: "Personalizador" },
  { href: "/sobre-nosotros", label: "Nosotros" },
  { href: "/contactanos", label: "Contacto" }
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 14);
    }
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl transition-all duration-300",
        scrolled
          ? "bg-black/85 py-0.5 shadow-[0_12px_30px_rgba(0,0,0,0.3)]"
          : "bg-gradient-to-b from-black/70 via-black/55 to-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <LogoGlow />
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <motion.div key={link.href} whileHover={{ y: -2 }}>
              <Link
                className={cn(
                  "relative text-sm text-neutral-200 transition-colors duration-200 hover:text-white",
                  pathname === link.href && "text-white"
                )}
                href={link.href}
                prefetch
                onClick={() => {
                  if (link.href === "/personalizador") trackEvent("personalizer_click_nav");
                }}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute -bottom-2 left-0 h-[2px] w-full origin-left scale-x-0 rounded bg-primary transition-transform duration-300",
                    pathname === link.href && "scale-x-100"
                  )}
                />
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="hidden md:block">
          <Button asChild size="sm">
            <Link href="/login">Panel Admin</Link>
          </Button>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
        </button>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-black/90 md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl border border-transparent px-3 py-2 text-sm text-neutral-200 transition hover:border-white/15 hover:bg-white/5 hover:text-white",
                    pathname === link.href && "border-red-300/30 bg-red-500/10 text-white"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild size="sm" className="mt-2">
                <Link href="/login" onClick={() => setOpen(false)}>
                  Panel Admin
                </Link>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
