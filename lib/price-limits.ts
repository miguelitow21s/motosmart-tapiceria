/**
 * Ninguna silla cuesta 100 millones: un precio más alto es un cero de más.
 * Lo usan la API (rechaza) y el panel (avisa en el campo). Con este tope el
 * precio cabe en una línea en la tarjeta más angosta de la tienda (320 px).
 */
export const MAX_PRICE = 99_999_999;

/**
 * Ninguna silla cuesta menos de mil pesos: un precio así casi siempre es uno
 * al que le faltaron los miles ($148 en lugar de $148.000).
 */
export const MIN_PRICE = 1000;

export function priceLooksIncomplete(price: number | null | undefined) {
  return price != null && price > 0 && price < MIN_PRICE;
}

/**
 * Precio que la tienda puede mostrar y poner en el mensaje de WhatsApp. Uno
 * mal escrito ($148, $0) se muestra como "Consultar precio" hasta que se
 * corrija en el panel, que lo marca con "Revisar precio".
 */
export function isShowablePrice(price: number | null | undefined): price is number {
  return price != null && price >= MIN_PRICE && price <= MAX_PRICE;
}
