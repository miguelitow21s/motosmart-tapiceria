import Link from "next/link";
import { containerClasses } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Página no encontrada: el mismo escenario negro de las cabeceras, con salida al catálogo. */
export default function NotFound() {
  return (
    <div data-theme="dark">
      <div className={cn(containerClasses, "py-16 md:py-28")}>
        <p className="type-display tabular text-[clamp(4.5rem,3rem+6vw,9rem)] leading-none text-ink-3">404</p>
        <h1 className="mt-4 max-w-[18ch] text-[clamp(2.25rem,1.3rem+3.4vw,4.75rem)] leading-[0.95] tracking-[-0.02em] uppercase">
          No encontramos esta página
        </h1>
        <p className="mt-4 max-w-xl text-ink-2 sm:text-lg">
          Puede que el enlace esté mal escrito o que el diseño ya no esté en el catálogo.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/catalogo">Ver catálogo</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
