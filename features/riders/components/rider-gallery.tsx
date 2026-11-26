import { SmartImage } from "@/components/shared/smart-image";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/cn";
import type { RiderPhoto } from "@/types";

/**
 * Fotos de clientes con su silla, en mosaico: la primera grande (en tableta y
 * computador ocupa dos columnas y dos filas), las demás al lado y debajo. El
 * nombre y la moto van sobre la foto, como en las tarjetas del catálogo. Al
 * final, la invitación a mandar la propia por WhatsApp.
 */
export function RiderGallery({ photos, shareHref }: { photos: RiderPhoto[]; shareHref: string }) {
  if (!photos.length) {
    return (
      <div className="max-w-xl">
        <p className="text-lg text-ink-2">Todavía no hay fotos de pilotos publicadas.</p>
        <ShareCard href={shareHref} className="mt-6" />
      </div>
    );
  }

  const mosaic = photos.length >= 3;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
      {photos.map((photo, index) => {
        const lead = mosaic && index === 0;
        return (
          <li
            key={photo.id}
            className={cn(
              "group relative overflow-hidden rounded-lg bg-surface",
              lead ? "col-span-2 aspect-4/5 md:row-span-2 md:aspect-auto" : "aspect-4/5"
            )}
          >
            <SmartImage
              src={photo.storage_path}
              alt={`${photo.rider_name} con su ${photo.moto_info}, tapizada por MotoSmart`}
              sizes={lead ? "(max-width: 767px) 100vw, 66vw" : "(max-width: 767px) 50vw, 33vw"}
              priority={index < 2}
              className="transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/55 to-transparent px-3 pt-14 pb-3 text-white sm:px-4 sm:pb-4">
              <p className={cn("type-display leading-tight uppercase", lead ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl")}>
                {photo.rider_name}
              </p>
              {photo.moto_info ? <p className="text-sm text-white/80">{photo.moto_info}</p> : null}
            </div>
          </li>
        );
      })}
      <li className="col-span-full">
        <ShareCard href={shareHref} />
      </li>
    </ul>
  );
}

function ShareCard({ href, className }: { href: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-lg border border-dashed border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
        className
      )}
    >
      <div>
        <p className="text-xl leading-tight font-semibold text-ink">¿Ya rodaste con tu silla MotoSmart?</p>
        <p className="mt-1 text-ink-2">Mándanos la foto con tu moto y sales aquí.</p>
      </div>
      <Button asChild variant="secondary" size="lg" className="w-full shrink-0 sm:w-auto">
        <WhatsAppLink href={href} source="pilotos">
          <WhatsAppIcon />
          Mandar mi foto
        </WhatsAppLink>
      </Button>
    </div>
  );
}
