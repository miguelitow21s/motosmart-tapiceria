import { SmartImage } from "@/components/shared/smart-image";
import { cn } from "@/lib/cn";
import type { RiderPhoto } from "@/types";

/** Fotos de clientes con su moto ya tapizada. */
export function RiderGallery({ photos }: { photos: RiderPhoto[] }) {
  if (!photos.length) {
    return <p className="max-w-xl text-lg text-ink-2">Todavía no hay fotos de pilotos publicadas.</p>;
  }

  // Cuatro columnas solo si llenan las filas: con 3 fotos quedaba vacío un
  // cuarto de la pantalla (mismo criterio que "Sillas por marca").
  const fourColumns = photos.length % 4 === 0;

  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3", fourColumns && "xl:grid-cols-4")}>
      {photos.map((photo, index) => (
        <li key={photo.id}>
          <figure>
            <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-surface">
              <SmartImage
                src={photo.storage_path}
                alt={`${photo.rider_name} con su ${photo.moto_info}, tapizada por MotoSmart`}
                sizes={fourColumns ? "(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw" : "(max-width: 767px) 50vw, 33vw"}
                priority={index < 2}
              />
            </div>
            <figcaption className="mt-3">
              <span className="type-display block text-lg leading-tight">{photo.rider_name}</span>
              <span className="block text-sm text-ink-2">{photo.moto_info}</span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
