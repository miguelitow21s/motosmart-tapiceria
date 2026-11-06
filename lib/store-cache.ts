import { revalidatePath, revalidateTag } from "next/cache";

/** Etiqueta de los datos de la tienda guardados fuera del render (la búsqueda). */
export const STORE_TAG = "tienda";

/**
 * La tienda se sirve desde caché y se regenera cada 5 minutos (app/layout.tsx).
 * Tras un cambio del panel se regenera ya: la administradora guarda un precio
 * y lo ve en la tienda al recargar, sin esperar. La búsqueda, que se arma en
 * cada visita, guarda los diseños aparte con STORE_TAG: también se borran.
 */
export function refreshStore() {
  revalidatePath("/", "layout");
  revalidateTag(STORE_TAG);
}
