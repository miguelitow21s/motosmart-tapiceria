import Link from "next/link";
import { containerClasses } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className={cn(containerClasses, "py-16 md:py-28")}>
      <p className="text-sm font-semibold text-ink-3">Error 404</p>
      <h1 className="mt-2 text-title">No encontramos esta página</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-2">
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
  );
}
