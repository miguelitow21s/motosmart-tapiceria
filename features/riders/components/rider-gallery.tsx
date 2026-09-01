import type { CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { SmartImage } from "@/components/shared/smart-image";
import type { RiderPhoto } from "@/types";

export function RiderGallery({ photos }: { photos: RiderPhoto[] }) {
  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-neutral-200">
        Todavía no hay fotos de pilotos publicadas. Vuelve pronto.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-animate-stagger>
      {photos.map((photo, idx) => (
        <Card key={photo.id} className="overflow-hidden p-0" style={{ "--i": idx } as CSSProperties}>
          <div className="relative aspect-[4/5] w-full">
            <SmartImage
              src={photo.storage_path}
              alt={`${photo.rider_name} con su ${photo.moto_info} - MotoSmart Tapicería`}
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            />
          </div>
          <div className="space-y-1 p-4">
            <p className="font-display text-lg text-white">{photo.rider_name}</p>
            <p className="text-sm text-neutral-300">{photo.moto_info}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
