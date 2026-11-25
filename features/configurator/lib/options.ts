import type { SeatPattern } from "./textures";

/*
  Opciones de "Arma tu silla". Los colores los escribe Natalia en el panel
  (Textos > Arma tu silla), uno por línea: "Rojo #c8102e". Así, si consigue
  un cuero nuevo, lo agrega sin tocar código.
*/

export type SeatColor = { name: string; hex: string };

export const SEAT_PATTERNS: Array<{ id: SeatPattern; label: string }> = [
  // Antideslizante primero: es lo que más hace el taller (ver el catálogo).
  { id: "antideslizante", label: "Antideslizante" },
  { id: "liso", label: "Liso" },
  { id: "rombos", label: "Rombos" }
];

export const DEFAULT_SEAT_COLORS_TEXT = [
  "Negro #161616",
  "Gris carbón #3b3d40",
  "Rojo #b3121f",
  "Azul #1d3fae",
  "Verde #4f9a1f",
  "Blanco #e9e7e1",
  "Café #5a3a24",
  "Amarillo #e0a91b"
].join("\n");

const LINE = /^(.+?)\s*(#[0-9a-f]{6}|#[0-9a-f]{3})\s*$/i;

/** Una línea por color, "Nombre #hex". Las líneas mal escritas se saltan. */
export function parseSeatColors(text: string): SeatColor[] {
  const seen = new Set<string>();
  const colors: SeatColor[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const match = raw.trim().match(LINE);
    if (!match) continue;
    const name = match[1].replace(/[:,-]+$/, "").trim();
    let hex = match[2].toLowerCase();
    if (hex.length === 4) hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    colors.push({ name, hex });
  }
  return colors.length >= 2 ? colors : parseSeatColors(DEFAULT_SEAT_COLORS_TEXT);
}

/** Líneas que el panel no va a poder leer, para avisar antes de guardar. */
export function invalidSeatColorLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !LINE.test(line));
}

export function seatQuoteMessage({
  shape,
  center,
  sides,
  stitch,
  pattern,
  moto
}: {
  /** Tipo de silla elegido, ej. "Deportiva". */
  shape: string;
  center: string;
  sides: string;
  stitch: string;
  pattern: string;
  moto: string;
}) {
  return [
    "Hola MotoSmart, armé esta silla en la página:",
    `- Tipo de silla: ${shape}`,
    `- Centro: ${center} (${pattern.toLowerCase()})`,
    `- Costados: ${sides}`,
    `- Costura: ${stitch}`,
    moto.trim() ? `- Mi moto: ${moto.trim()}` : "- Mi moto: (marca y modelo)",
    "¿Cuánto me sale?"
  ].join("\n");
}
