// Unica regla de orden del carrusel "Trabajos recientes". La usan el panel
// (lo que la administradora ve y reordena) y /api/carousel (lo que ve el
// publico): antes el publico ignoraba el orden guardado y mostraba por fecha,
// asi que reordenar en el panel no cambiaba nada en la web.
//
// Primero van las fotos en el orden guardado en settings.carousel_order; las
// que no estan ahi (recien subidas) van despues, de la mas nueva a la mas vieja.

export function parseCarouselOrder(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const ids = (value as { ids?: unknown }).ids;
  return Array.isArray(ids) ? ids.map((id) => String(id)) : [];
}

export function sortByCarouselOrder<T extends { id: string; created_at: string }>(items: T[], orderIds: string[]): T[] {
  const position = new Map(orderIds.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const posA = position.get(a.id);
    const posB = position.get(b.id);
    if (posA != null && posB != null) return posA - posB;
    if (posA != null) return -1;
    if (posB != null) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
