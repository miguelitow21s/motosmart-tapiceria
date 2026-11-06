import { revalidatePath } from "next/cache";

/**
 * La tienda se sirve desde caché y se regenera cada 5 minutos (app/layout.tsx).
 * Tras un cambio del panel se regenera ya: la administradora guarda un precio
 * y lo ve en la tienda al recargar, sin esperar.
 */
export function refreshStore() {
  revalidatePath("/", "layout");
}
