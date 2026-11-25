import { DesignCard, designGridSizes } from "@/features/catalog/components/design-card";
import { sortForStore, type DesignWithBrand } from "@/features/catalog/services/catalog.service";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

/** Columnas en escritorio cuando la rejilla va dentro de un tramo del catálogo. */
const DESKTOP_COLUMNS = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" } as const;

/**
 * Rejilla de sillas: dos por fila en el teléfono, como en cualquier tienda.
 * Orden: en promoción, luego con foto, luego por nombre.
 */
export async function DesignGrid({
  designs,
  showBrand = true,
  priorityCount = 0,
  maxColumns = 4,
  preview = false,
  columns,
  empty
}: {
  designs: DesignWithBrand[];
  showBrand?: boolean;
  /** Cuántas fotos cargar con prioridad (las que se ven sin bajar). */
  priorityCount?: number;
  /** 3 cuando la cantidad no llena filas de 4 (p. ej. 6 marcas en el inicio). */
  maxColumns?: 3 | 4;
  /**
   * Muestra de una marca con enlace a "ver todos" (catálogo): con cuatro
   * sillas, en tres columnas (tableta, portátil chico) la cuarta quedaría sola
   * en su fila, así que ahí se oculta. En el teléfono son dos filas de dos.
   */
  preview?: boolean;
  /**
   * Catálogo: desde 1024 px cada marca ocupa tantas columnas como sillas
   * muestra, y las marcas chicas comparten fila.
   */
  columns?: 1 | 2 | 3 | 4;
  empty?: React.ReactNode;
}) {
  if (!designs.length) {
    return empty ?? null;
  }

  const settings = await getSiteSettings();
  const sorted = sortForStore(designs);

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3",
        columns ? DESKTOP_COLUMNS[columns] : maxColumns === 4 && "xl:grid-cols-4"
      )}
    >
      {sorted.map((design, index) => (
        <DesignCard
          key={design.id}
          design={design}
          whatsappNumber={settings.whatsapp_number}
          showBrand={showBrand}
          priority={index < priorityCount}
          sizes={
            columns
              ? "(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
              : maxColumns === 4
                ? designGridSizes
                : "(max-width: 767px) 50vw, 33vw"
          }
          className={
            preview && sorted.length === 4 && index === 3
              ? columns
                ? "md:max-lg:hidden"
                : maxColumns === 4
                  ? "md:max-xl:hidden"
                  : undefined
              : undefined
          }
        />
      ))}
    </div>
  );
}
