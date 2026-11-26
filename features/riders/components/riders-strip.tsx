import Link from "next/link";
import { containerClasses } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import { cn } from "@/lib/cn";
import type { RiderPhoto } from "@/types";

/**
 * «Pilotos de la casa» en el inicio: clientes reales con su silla, las fotos
 * que la administradora publica en el panel (pestaña Pilotos). Las tres
 * primeras, grandes, sobre negro; el resto en /pilotos. Sin fotos, no sale.
 */
export function RidersStrip({ photos }: { photos: RiderPhoto[] }) {
  const shown = photos.slice(0, 3);
  if (!shown.length) return null;

  return (
    <section aria-labelledby="pilotos-inicio" data-theme="dark" className="border-t border-line">
      <div className={cn(containerClasses, "py-12 md:py-20")}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 id="pilotos-inicio" className="text-[clamp(2.75rem,1.2rem+6vw,7rem)] leading-[0.88] tracking-[-0.02em] uppercase">
            Pilotos de la casa
          </h2>
          <Link href="/pilotos" className="link-underline inline-flex min-h-11 shrink-0 items-center font-semibold md:pb-2">
            Ver todos los pilotos
          </Link>
        </div>
        <ul
          className={cn(
            "mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:mt-12",
            shown.length === 1 ? "max-w-xl grid-cols-1" : shown.length === 3 && "lg:grid-cols-3"
          )}
        >
          {shown.map((photo, index) => (
            <li
              key={photo.id}
              className={cn(
                "group relative aspect-4/5 overflow-hidden rounded-lg bg-surface",
                // Con 3 fotos en celular y tableta: la primera a lo ancho, las otras dos debajo, lado a lado.
                shown.length === 3 && index === 0 && "col-span-2 aspect-4/3 sm:aspect-video lg:col-span-1 lg:aspect-4/5"
              )}
            >
              <SmartImage
                src={photo.storage_path}
                alt={`${photo.rider_name} con su ${photo.moto_info}, tapizada por MotoSmart`}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
              />
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/50 to-transparent px-3 pt-16 pb-3 text-white sm:px-4 sm:pb-4">
                <p className="type-display text-xl leading-tight uppercase sm:text-3xl">{photo.rider_name}</p>
                {photo.moto_info ? <p className="text-sm text-white/80">{photo.moto_info}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
