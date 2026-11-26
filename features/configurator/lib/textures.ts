/*
  Texturas de la silla 3D, generadas en el navegador (nada que descargar).

  Todo se mide en metros de material: el patrón de rombos y el grano del
  cuero no se estiran cuando la silla se angosta hacia la punta, porque las
  UV de la malla también están en metros (ver seat-scene.ts).
*/
import {
  CanvasTexture,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  UnsignedByteType
} from "three";
import { FINE_TILE_M, GRAIN_SIZE, MAP_SIZE, buildNormalMaps, type NormalMaps } from "./texture-data";

export { FINE_TILE_M };

export type SeatPattern = "liso" | "rombos" | "antideslizante";
/** Los tres antideslizantes del taller. */
export type GripType = "grueso" | "lija" | "gamuza";

/** Lado del rombo (de punta a punta), en metros. Una tesela = un rombo. */
export const DIAMOND_TILE_M = 0.1;
/** Tesela del grano de cuero, en metros. */
export const GRAIN_TILE_M = 0.04;

const SIZE = 512;

function makeCanvas(size = SIZE) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

/** Mapa de normales listo para WebGL, a partir de los bytes del worker. */
function normalTexture(data: Uint8Array, size: number) {
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export type SeatTextures = {
  grainNormal: DataTexture;
  diamondNormal: DataTexture;
  gripNormal: DataTexture;
  gritNormal: DataTexture;
  suedeNormal: DataTexture;
  dispose(): void;
};

/** Calcula los mapas en un Web Worker; si no se puede, en el hilo principal. */
function computeMaps(): Promise<NormalMaps> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./textures.worker.ts", import.meta.url));
    } catch {
      resolve(buildNormalMaps());
      return;
    }
    worker.onmessage = (event: MessageEvent<NormalMaps>) => {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      worker.terminate();
      try {
        resolve(buildNormalMaps());
      } catch (error) {
        reject(error);
      }
    };
    worker.postMessage(null);
  });
}

export async function loadSeatTextures(): Promise<SeatTextures> {
  const maps = await computeMaps();
  const grainNormal = normalTexture(maps.grain, GRAIN_SIZE);
  const diamondNormal = normalTexture(maps.diamond, MAP_SIZE);
  const gripNormal = normalTexture(maps.grip, MAP_SIZE);
  const gritNormal = normalTexture(maps.grit, MAP_SIZE);
  const suedeNormal = normalTexture(maps.suede, MAP_SIZE);
  return {
    grainNormal,
    diamondNormal,
    gripNormal,
    gritNormal,
    suedeNormal,
    dispose() {
      grainNormal.dispose();
      diamondNormal.dispose();
      gripNormal.dispose();
      gritNormal.dispose();
      suedeNormal.dispose();
    }
  };
}

/**
 * Color del panel central con rombos: el color del cuero y la costura pintada
 * sobre las líneas. Se vuelve a pintar cuando cambia un color.
 */
export function paintDiamondColor(texture: CanvasTexture | null, base: string, stitch: string) {
  const canvas = (texture?.image as HTMLCanvasElement | undefined) ?? makeCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin contexto 2D");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  // 1 mm = 5,12 px. Puntadas de 4 mm con 2 mm de aire, hilo de 1,2 mm.
  const mm = SIZE / (DIAMOND_TILE_M * 1000);
  ctx.strokeStyle = stitch;
  ctx.lineWidth = 1.2 * mm;
  ctx.lineCap = "round";
  ctx.setLineDash([4 * mm, 2 * mm]);
  // Las dos diagonales, más sus copias desplazadas, cubren la tesela sin
  // cortar una puntada en el borde.
  for (const shift of [-SIZE, 0, SIZE]) {
    ctx.beginPath();
    ctx.moveTo(shift, 0);
    ctx.lineTo(shift + SIZE, SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(shift + SIZE, 0);
    ctx.lineTo(shift, SIZE);
    ctx.stroke();
  }
  if (texture) {
    texture.needsUpdate = true;
    return texture;
  }
  const created = new CanvasTexture(canvas);
  created.colorSpace = SRGBColorSpace;
  created.wrapS = created.wrapT = RepeatWrapping;
  created.anisotropy = 4;
  return created;
}

/** Sombra de contacto: un degradado radial suave bajo la silla. */
export function createContactShadow() {
  const canvas = makeCanvas(256);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin contexto 2D");
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(0,0,0,0.85)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0.45)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/* ------------------------------------------------------------ Bordado */

/** Resolución del bordado: píxeles de textura por cm de silla. */
const EMBROIDERY_PX_PER_CM = 44;
/** Alto de las letras bordadas, en cm: el de un bordado de costado real. */
const LETTER_HEIGHT_CM = 3;
/** Fracción del largo del parche que puede ocupar la palabra. */
const LETTER_MAX_WIDTH = 0.6;
/** Grosor del hilo del relleno (satín), en cm: unos 0,9 mm reales por puntada. */
const SATIN_PITCH_CM = 0.09;
/** Ángulo de las puntadas del relleno en el lienzo (rad): satín inclinado. */
export const SATIN_ANGLE = -1.05;
/** Borde de las letras, en cm: un cordón de otro tono alrededor del relleno. */
const OUTLINE_CM = 0.16;

export type EmbroideryTextures = {
  /** Color del hilo con el brillo de cada puntada; alfa = la forma de las letras. */
  color: CanvasTexture;
  /** Relieve: letras abombadas y cada puntada marcada. */
  normal: CanvasTexture;
  /** Sombra que el bordado deja sobre el cuero, un poco corrida hacia abajo. */
  shadow: CanvasTexture;
  dispose(): void;
};

/** La misma Archivo de la página (la variable la pone next/font en <html>). */
function embroideryFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-archivo").trim();
  return family ? `${family}, Arial, sans-serif` : "Arial, sans-serif";
}

/** Espera a que la letra de la página esté lista antes de pintar con ella. */
export async function loadEmbroideryFont() {
  try {
    await document.fonts.load(`800 100px ${embroideryFont()}`, "MOTOSMART");
  } catch {
    // Sin la fuente se borda con Arial gruesa: igual se lee.
  }
}

/** Archivo extragruesa de ancho normal: así se ven las marcas bordadas de verdad. */
function setFont(ctx: CanvasRenderingContext2D, size: number) {
  ctx.font = `800 ${size}px ${embroideryFont()}`;
}

/** Caja de píxeles [x0, x1) × [y0, y1) donde se trabaja: el resto del lienzo queda vacío. */
type Box = { x0: number; y0: number; x1: number; y1: number };

/**
 * Desenfoque de caja separable, dos pasadas (casi gaussiano), solo dentro de
 * `box`. Fuera de la caja la máscara vale cero, así que el borde no cambia nada.
 */
function blur(source: Float32Array, width: number, box: Box, radius: number) {
  const r = Math.max(1, Math.round(radius));
  const { x0, y0, x1, y1 } = box;
  const span = 2 * r + 1;
  let a: Float32Array = source;
  let b: Float32Array = new Float32Array(a.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = y0; y < y1; y++) {
      const row = y * width;
      let sum = 0;
      for (let x = x0 - r; x <= x0 + r; x++) sum += x >= x0 && x < x1 ? a[row + x] : 0;
      for (let x = x0; x < x1; x++) {
        b[row + x] = sum / span;
        const add = x + r + 1;
        const drop = x - r;
        sum += (add < x1 ? a[row + add] : 0) - (drop >= x0 ? a[row + drop] : 0);
      }
    }
    [a, b] = [b, a];
    for (let x = x0; x < x1; x++) {
      let sum = 0;
      for (let y = y0 - r; y <= y0 + r; y++) sum += y >= y0 && y < y1 ? a[y * width + x] : 0;
      for (let y = y0; y < y1; y++) {
        b[y * width + x] = sum / span;
        const add = y + r + 1;
        const drop = y - r;
        sum += (add < y1 ? a[add * width + x] : 0) - (drop >= y0 ? a[drop * width + x] : 0);
      }
    }
    [a, b] = [b, a];
  }
  return a;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Brillo fijo por puntada: cada hilo refleja un poco distinto. */
const JITTER = Float32Array.from({ length: 256 }, (_, i) => {
  const v = Math.sin(i * 127.1) * 43758.5453;
  return (v - Math.floor(v)) * 0.12;
});

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export type EmbroideryStyle = "recta" | "inclinada";

/** Inclinación de la letra "inclinada" (como las marcas deportivas): unos 12°. */
const ITALIC = Math.tan((12 * Math.PI) / 180);

/**
 * Pinta la marca bordada para un parche de `widthCm` × `heightCm`: relleno en
 * satín (puntadas inclinadas, cada una con su brillo), cordón alrededor en otro
 * tono del mismo hilo, relieve y sombra. Devuelve null si no hay texto.
 *
 * Se repinta al escribir, así que solo se trabaja en la caja de las letras y
 * sin funciones trigonométricas por píxel.
 */
export function paintEmbroidery(
  text: string,
  thread: string,
  style: EmbroideryStyle,
  widthCm: number,
  heightCm: number
) {
  const label = text.trim();
  if (!label) return null;
  const width = Math.min(2048, Math.round(widthCm * EMBROIDERY_PX_PER_CM));
  const scale = width / widthCm;
  const height = Math.max(32, Math.round(heightCm * scale));
  const slant = style === "inclinada" ? ITALIC : 0;

  // Máscaras: el relleno de las letras, y las letras con su cordón.
  const canvas = canvasOf(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Sin contexto 2D");
  setFont(ctx, 100);
  const probe = ctx.measureText(label);
  const probeHeight = probe.actualBoundingBoxAscent + probe.actualBoundingBoxDescent || 72;
  // Letras de unos 3 cm, sin pasar de dos tercios del parche (el resto es aire
  // para la sombra).
  let size = (100 * Math.min(height * 0.66, LETTER_HEIGHT_CM * scale)) / probeHeight;
  let squeeze = 1;
  const maxWidth = width * LETTER_MAX_WIDTH;
  const textWidth = ((probe.width + slant * probeHeight) * size) / 100;
  if (textWidth > maxWidth) {
    // Primero se aprietan un poco las letras; si no alcanza, se achican.
    squeeze = Math.max(0.84, maxWidth / textWidth);
    size *= Math.min(1, maxWidth / (textWidth * squeeze));
  }
  setFont(ctx, size);
  const metrics = ctx.measureText(label);
  const outline = OUTLINE_CM * scale;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  const drawText = (withOutline: boolean) => {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2 + (ascent - descent) / 2);
    // La inclinación gira en torno a la mitad de la letra, para que quede centrada.
    ctx.transform(squeeze, 0, -slant, 1, -slant * ((ascent - descent) / 2), 0);
    if (withOutline) {
      ctx.lineWidth = outline * 2;
      ctx.strokeText(label, 0, 0);
    }
    ctx.fillText(label, 0, 0);
    ctx.restore();
    const data = ctx.getImageData(0, 0, width, height).data;
    const mask = new Float32Array(width * height);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] / 255;
    return mask;
  };
  const fill = drawText(false);
  const outer = drawText(true);

  // Caja de las letras, con aire para el desenfoque y la sombra.
  let x0 = width;
  let x1 = 0;
  let y0 = height;
  let y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (outer[y * width + x] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < x0) return null;
  const radius = scale * 0.13;
  const shift = Math.round(scale * 0.1);
  const pad = Math.ceil(radius * 2) + 2;
  const box: Box = {
    x0: Math.max(0, x0 - pad),
    y0: Math.max(0, y0 - pad),
    x1: Math.min(width, x1 + pad + 1),
    y1: Math.min(height, y1 + pad + shift + 1)
  };

  // Color y relieve, píxel a píxel con las mismas puntadas.
  const puff = blur(outer, width, box, radius);
  const cos = Math.cos(SATIN_ANGLE);
  const sin = Math.sin(SATIN_ANGLE);
  const pitch = SATIN_PITCH_CM * scale;
  const cordPitch = pitch * 0.8;
  const heightMap = new Float32Array(width * height);
  const [tr, tg, tb] = hexToRgb(thread);
  // El cordón: el mismo hilo más oscuro (sobre hilo muy oscuro, más claro).
  const luminance = (0.2126 * tr + 0.7152 * tg + 0.0722 * tb) / 255;
  const edge = luminance > 0.18 ? 0.55 : 1.8;
  const color = ctx.createImageData(width, height);
  const pixels = color.data;
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const i = y * width + x;
      const o = outer[i];
      if (o <= 0) continue;
      // Satín: hilos paralelos y redondos (claros al centro, surco entre uno y otro).
      const phase = (x * cos + y * sin) / pitch;
      const stitch = Math.floor(phase);
      const f1 = phase - stitch;
      const ridge = 4 * f1 * (1 - f1);
      // Cordón: puntadas cortas cruzadas en el otro sentido.
      const phase2 = (x * sin - y * cos) / cordPitch;
      const f2 = phase2 - Math.floor(phase2);
      const ridge2 = 4 * f2 * (1 - f2);
      const t = Math.min(1, fill[i] / o);
      const satin = 0.72 + 0.34 * ridge - JITTER[stitch & 255];
      const cord = (0.78 + 0.26 * ridge2) * edge;
      const shade = cord + (satin - cord) * t;
      const p = i * 4;
      pixels[p] = Math.min(255, tr * shade);
      pixels[p + 1] = Math.min(255, tg * shade);
      pixels[p + 2] = Math.min(255, tb * shade);
      pixels[p + 3] = o * 255;
      heightMap[i] = puff[i] * 0.7 + o * (t * 0.3 * ridge + (1 - t) * 0.22 * ridge2);
    }
  }
  ctx.putImageData(color, 0, 0);
  const colorTexture = new CanvasTexture(canvas);
  colorTexture.colorSpace = SRGBColorSpace;
  colorTexture.anisotropy = 8;

  // Normales a partir del relieve (diferencias centrales). Fuera de la caja, plano.
  const normalCanvas = canvasOf(width, height);
  const normalCtx = normalCanvas.getContext("2d");
  if (!normalCtx) throw new Error("Sin contexto 2D");
  const normalImage = normalCtx.createImageData(width, height);
  const n = normalImage.data;
  // (128, 128, 255, 255) en un entero de 32 bits (memoria little-endian).
  new Uint32Array(n.buffer).fill(0xffff8080);
  const strength = 3;
  for (let y = box.y0; y < box.y1; y++) {
    const up = Math.max(0, y - 1) * width;
    const down = Math.min(height - 1, y + 1) * width;
    const row = y * width;
    for (let x = box.x0; x < box.x1; x++) {
      const dx = (heightMap[row + Math.min(width - 1, x + 1)] - heightMap[row + Math.max(0, x - 1)]) * strength;
      // En la textura la v crece hacia arriba; en el lienzo, la y hacia abajo.
      const dy = (heightMap[down + x] - heightMap[up + x]) * strength;
      const k = 127.5 / Math.sqrt(dx * dx + dy * dy + 1);
      const p = (row + x) * 4;
      n[p] = 127.5 - dx * k;
      n[p + 1] = 127.5 + dy * k;
      n[p + 2] = 127.5 + k;
    }
  }
  normalCtx.putImageData(normalImage, 0, 0);
  const normal = new CanvasTexture(normalCanvas);
  normal.colorSpace = NoColorSpace;
  normal.anisotropy = 8;

  // Sombra: las letras desenfocadas y corridas 1 mm hacia abajo (la luz viene de arriba).
  const shadowCanvas = canvasOf(width, height);
  const shadowCtx = shadowCanvas.getContext("2d");
  if (!shadowCtx) throw new Error("Sin contexto 2D");
  const shadowImage = shadowCtx.createImageData(width, height);
  const sh = shadowImage.data;
  for (let y = box.y0; y < box.y1; y++) {
    const from = Math.max(0, y - shift) * width;
    const row = y * width;
    for (let x = box.x0; x < box.x1; x++) sh[(row + x) * 4 + 3] = Math.min(1, puff[from + x] * 1.2) * 185;
  }
  shadowCtx.putImageData(shadowImage, 0, 0);
  const shadow = new CanvasTexture(shadowCanvas);
  shadow.colorSpace = SRGBColorSpace;

  return {
    color: colorTexture,
    normal,
    shadow,
    dispose() {
      colorTexture.dispose();
      normal.dispose();
      shadow.dispose();
    }
  } satisfies EmbroideryTextures;
}
