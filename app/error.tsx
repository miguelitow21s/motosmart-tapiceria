"use client";

import Link from "next/link";
import { containerClasses } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
  Si una página de la tienda falla al cargar (sin conexión con la base de
  datos, por ejemplo), esto reemplaza la pantalla genérica en inglés de Next.
  El menú y el pie siguen visibles, con el botón de WhatsApp de siempre.
*/
export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={cn(containerClasses, "py-16 md:py-28")}>
      <p className="text-sm font-semibold text-ink-3">Algo falló</p>
      <h1 className="mt-2 text-title">No pudimos cargar esta página</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-2">
        Suele ser un problema de conexión pasajero. Intenta de nuevo en unos segundos o escríbenos por WhatsApp.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={reset}>
          Intentar de nuevo
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
