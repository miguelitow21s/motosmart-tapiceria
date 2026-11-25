/*
  Texturas de la silla 3D, generadas en el navegador (nada que descargar).

  Todo se mide en metros de material: el patrón de rombos y el grano del
  cuero no se estiran cuando la silla se angosta hacia la punta, porque las
  UV de la malla también están en metros (ver seat-scene.ts).
*/
import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from "three";

export type SeatPattern = "liso" | "rombos" | "antideslizante";

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

/** Pseudoaleatorio con semilla: la textura sale igual en cada visita. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Grano de cuero: ruido celular (Worley) que se repite sin costura. Devuelve
 * una altura 0..1 por píxel: las "piedritas" del cuero son altas en el centro
 * y bajan en los pliegues entre ellas.
 */
function leatherGrain(size: number, cells: number, seed: number) {
  const rand = seeded(seed);
  const points: Array<[number, number]> = [];
  for (let i = 0; i < cells; i++) points.push([rand() * size, rand() * size]);
  const height = new Float32Array(size * size);
  // Rejilla de cubetas para no comparar cada píxel con todos los puntos.
  const grid = Math.max(1, Math.floor(Math.sqrt(cells)));
  const cell = size / grid;
  const buckets: number[][] = Array.from({ length: grid * grid }, () => []);
  points.forEach(([x, y], index) => {
    buckets[Math.min(grid - 1, Math.floor(y / cell)) * grid + Math.min(grid - 1, Math.floor(x / cell))].push(index);
  });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      let f1 = Infinity;
      let f2 = Infinity;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const bx = (gx + ox + grid) % grid;
          const by = (gy + oy + grid) % grid;
          for (const index of buckets[by * grid + bx]) {
            let dx = Math.abs(points[index][0] - x);
            let dy = Math.abs(points[index][1] - y);
            if (dx > size / 2) dx = size - dx;
            if (dy > size / 2) dy = size - dy;
            const d = dx * dx + dy * dy;
            if (d < f1) {
              f2 = f1;
              f1 = d;
            } else if (d < f2) {
              f2 = d;
            }
          }
        }
      }
      // F2 - F1: cero en el pliegue entre dos piedritas.
      const edge = Math.sqrt(f2) - Math.sqrt(f1);
      height[y * size + x] = Math.min(1, edge / (cell * 0.35));
    }
  }
  return height;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Altura a mapa de normales (tangente), con vecinos que dan la vuelta. */
function heightToNormal(height: Float32Array, size: number, strength: number) {
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin contexto 2D");
  const image = ctx.createImageData(size, size);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const ny = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      image.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      image.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      image.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Distancia (en fracción de tesela) a la línea de rombos más cercana. */
function diamondDistance(s: number, t: number) {
  const a = s + t;
  const b = s - t;
  const da = Math.abs(a - Math.round(a));
  const db = Math.abs(b - Math.round(b));
  return Math.min(da, db) / Math.SQRT2;
}

export type SeatTextures = {
  grainNormal: CanvasTexture;
  diamondNormal: CanvasTexture;
  gripNormal: CanvasTexture;
  dispose(): void;
};

export function createSeatTextures(): SeatTextures {
  // Grano: una tesela de 6 cm con 140 piedritas (unos 5 mm cada una).
  const grainSize = 256;
  const grain = leatherGrain(grainSize, 220, 7);
  const grainNormal = heightToNormal(grain, grainSize, 0.9);

  // Rombos: cada tesela es un rombo de 10 cm, acolchado y hundido en la
  // costura, con grano encima (a otra escala, también sin costura).
  const fine = leatherGrain(SIZE, 900, 11);
  const diamond = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = diamondDistance(x / SIZE, y / SIZE);
      // 0 en la costura, 1 en el centro del rombo: un cojín, no una pirámide.
      const puff = Math.sqrt(smoothstep(0.0, 0.2, d));
      diamond[y * SIZE + x] = puff * 0.9 + fine[y * SIZE + x] * 0.05;
    }
  }
  const diamondNormal = heightToNormal(diamond, SIZE, 7);

  // Antideslizante: puntos en hexágono cada 5 mm (20 por tesela de 10 cm).
  const grip = new Float32Array(SIZE * SIZE);
  const rows = 20;
  const pitch = SIZE / rows;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const row = Math.floor(y / pitch);
      const offset = row % 2 === 0 ? 0 : pitch / 2;
      const cx = (Math.floor((x - offset) / pitch) + 0.5) * pitch + offset;
      const cy = (row + 0.5) * pitch;
      const d = Math.hypot(x - cx, y - cy) / (pitch * 0.5);
      grip[y * SIZE + x] = (1 - smoothstep(0.55, 0.85, d)) * 0.8 + fine[y * SIZE + x] * 0.06;
    }
  }
  const gripNormal = heightToNormal(grip, SIZE, 3.2);

  return {
    grainNormal,
    diamondNormal,
    gripNormal,
    dispose() {
      grainNormal.dispose();
      diamondNormal.dispose();
      gripNormal.dispose();
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
