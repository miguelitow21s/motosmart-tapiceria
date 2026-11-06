import { containerClasses } from "@/components/shared/section";
import { cn } from "@/lib/cn";

/**
 * Esqueleto con la forma real de las páginas de la tienda: título y grilla de
 * sillas 3:4. No va en app/loading.tsx: un loading en la raíz (o en /marca)
 * abre el streaming antes de notFound() y una marca que no existe respondía
 * 200 en vez de 404. Las páginas son estáticas y llegan precargadas, así que
 * solo lo usan las rutas donde aún puede verse.
 */
export function PageSkeleton() {
  return (
    <div className={cn(containerClasses, "pt-6 pb-16 md:pt-10")} aria-busy="true">
      <span className="sr-only" role="status">
        Cargando...
      </span>
      <div aria-hidden="true">
        <div className="h-10 w-2/3 max-w-md animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
        <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded-md bg-surface motion-reduce:animate-none" />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, idx) => (
            <div key={idx} className={cn(idx >= 4 && "hidden md:block")}>
              <div className="aspect-3/4 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
              <div className="mt-3 h-5 w-3/4 animate-pulse rounded-md bg-surface motion-reduce:animate-none" />
              <div className="mt-2 h-5 w-1/2 animate-pulse rounded-md bg-surface motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
