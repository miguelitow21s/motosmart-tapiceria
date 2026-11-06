import type { DesignWithBrand } from "@/features/catalog/services/catalog.service";

/** Lo más largo que se acepta en la búsqueda: un modelo de moto cabe de sobra. */
export const SEARCH_MAX_LENGTH = 60;

/**
 * Palabras que no distinguen un diseño de otro: todo el catálogo son sillas
 * para moto. "silla nmax" busca "nmax"; "funda moto" muestra todo.
 */
const GENERIC_WORDS = new Set([
  "silla",
  "sillas",
  "sillin",
  "asiento",
  "asientos",
  "funda",
  "fundas",
  "forro",
  "forros",
  "tapiceria",
  "tapizado",
  "tapizar",
  "moto",
  "motos",
  "para",
  "de",
  "del",
  "la",
  "el",
  "mi",
  "y"
]);

/** Minúsculas, sin tildes y solo letras y números: "N-MAX 155" → "nmax155". */
function compact(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** El texto de ?q= limpio: un solo valor, espacios simples, con tope de largo. */
export function readQuery(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
}

/**
 * Diseños cuyo nombre o marca contienen cada palabra buscada, sin importar
 * mayúsculas, tildes, guiones ni espacios: "nmax", "N-MAX" y "yamaha n max"
 * encuentran la misma silla.
 */
export function searchDesigns(designs: DesignWithBrand[], query: string) {
  const words = query
    .split(" ")
    .map(compact)
    .filter((word) => word && !GENERIC_WORDS.has(word));
  if (!words.length) return designs;

  const joined = words.join("");
  return designs.filter((design) => {
    const haystack = compact(`${design.brand_name} ${design.name}`);
    // "n max" escrito separado también encuentra "NMAX".
    return words.every((word) => haystack.includes(word)) || haystack.includes(joined);
  });
}
