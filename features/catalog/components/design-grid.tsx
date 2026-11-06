import { DesignCard, designGridSizes } from "@/features/catalog/components/design-card";
import { sortForStore, type DesignWithBrand } from "@/features/catalog/services/catalog.service";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * Rejilla de sillas: dos por fila en el teléfono, como en cualquier tienda.
 * Orden: en promoción, luego con foto, luego por nombre.
 */
export async function DesignGrid({
  designs,
  showBrand = true,
  priorityCount = 0,
  maxColumns = 4,
  empty
}: {
  designs: DesignWithBrand[];
  showBrand?: boolean;
  /** Cuántas fotos cargar con prioridad (las que se ven sin bajar). */
  priorityCount?: number;
  /** 3 cuando la cantidad no llena filas de 4 (p. ej. 6 marcas en el inicio). */
  maxColumns?: 3 | 4;
  empty?: React.ReactNode;
}) {
  if (!designs.length) {
    return empty ?? null;
  }

  const settings = await getSiteSettings();
  const sorted = sortForStore(designs);

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3", maxColumns === 4 && "xl:grid-cols-4")}>
      {sorted.map((design, index) => (
        <DesignCard
          key={design.id}
          design={design}
          whatsappNumber={settings.whatsapp_number}
          showBrand={showBrand}
          priority={index < priorityCount}
          sizes={maxColumns === 4 ? designGridSizes : "(max-width: 767px) 50vw, 33vw"}
        />
      ))}
    </div>
  );
}
