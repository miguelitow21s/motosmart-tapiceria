import type { SeatShapeId } from "./shapes.ts";

/*
  La forma de silla que más se parece a una moto escrita a mano ("Yamaha
  DT 125", "NMAX 2023"). Sirve para abrir "Arma tu silla" desde un diseño
  con la forma ya elegida; el cliente la cambia si no es.
*/

// Palabras (sin espacios ni guiones, en minúsculas) que delatan cada forma.
// Se revisan en este orden: la primera que coincide gana.
const RULES: Array<[SeatShapeId, string[]]> = [
  ["motocross", ["crf", "kx", "yz", "sxf", "exc", "rmz"]],
  [
    "scooter",
    ["nmax", "bws", "agility", "dynamic", "twist", "pcx", "navi", "jog", "fino", "next", "active", "unik", "xtreme", "urban", "an100", "scooter", "xmax", "dio"]
  ],
  [
    "enduro",
    ["dt", "dte", "xtz", "xre", "xr", "xl", "xlr", "tt", "ttr", "ttx", "klx", "klr", "dr", "ts", "tsz", "xt", "bros", "tornado", "vstrom", "freewind", "adventure", "enduro", "sl125", "sm200", "ak235r"]
  ],
  ["boxer", ["boxer", "platino", "discover", "splendor", "eco", "hero", "ct100"]],
  [
    "deportiva",
    ["pulsar", "ns", "fz", "fazer", "apache", "gixxer", "r15", "r3", "cbr", "ninja", "mt", "duke", "rtx", "gsr", "rs200"]
  ]
];

function tokens(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** La forma para esa moto, o null si no se reconoce (queda la que esté elegida). */
export function guessSeatShape(moto: string): SeatShapeId | null {
  const words = tokens(moto);
  if (!words.length) return null;
  // "DT125", "DT 125" y "DT-125" cuentan igual: se prueba cada palabra sola,
  // sin sus números del final, y pegada a la siguiente.
  const candidates = new Set<string>();
  words.forEach((word, index) => {
    candidates.add(word);
    candidates.add(word.replace(/\d+$/, ""));
    if (words[index + 1]) candidates.add(word + words[index + 1]);
  });
  for (const [shape, keys] of RULES) {
    if (keys.some((key) => candidates.has(key))) return shape;
  }
  return words.some((word) => /^[a-z]/.test(word)) ? "calle" : null;
}

/** El texto de "?moto=" limpio: una línea, sin "Diseño 2" de relleno, con tope de largo. */
export function readMotoParam(raw: string | null) {
  return (raw ?? "")
    .replace(/\b(dise[nñ]o|design)\s*\d*\b/gi, " ")
    .replace(/[^\p{L}\p{N} ./+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}
