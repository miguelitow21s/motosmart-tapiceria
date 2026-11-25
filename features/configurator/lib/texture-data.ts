/*
  Mapas de normales de la silla 3D, calculados como bytes RGBA.

  No usa three.js ni el DOM: corre dentro de un Web Worker para que el
  teléfono no se congele mientras se genera el grano del cuero (son cientos de
  miles de píxeles). Si el navegador no puede crear el worker, la misma
  función corre en el hilo principal.

  Las filas salen de abajo hacia arriba (fila 0 = borde inferior), que es como
  WebGL lee una DataTexture: así el relieve no se invierte.
*/

/** Lado de los mapas grandes (rombos y antideslizante). */
export const MAP_SIZE = 512;
/** Lado del mapa de grano liso. */
export const GRAIN_SIZE = 256;

export type NormalMaps = {
  grain: Uint8Array;
  diamond: Uint8Array;
  grip: Uint8Array;
};

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
  const xs = new Float32Array(cells);
  const ys = new Float32Array(cells);
  for (let i = 0; i < cells; i++) {
    xs[i] = rand() * size;
    ys[i] = rand() * size;
  }
  const height = new Float32Array(size * size);
  // Rejilla de cubetas para no comparar cada píxel con todos los puntos.
  const grid = Math.max(1, Math.floor(Math.sqrt(cells)));
  const cell = size / grid;
  const buckets: number[][] = Array.from({ length: grid * grid }, () => []);
  for (let i = 0; i < cells; i++) {
    buckets[Math.min(grid - 1, Math.floor(ys[i] / cell)) * grid + Math.min(grid - 1, Math.floor(xs[i] / cell))].push(i);
  }
  const half = size / 2;
  const scale = 1 / (cell * 0.35);
  for (let y = 0; y < size; y++) {
    const gy = Math.floor(y / cell);
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cell);
      let f1 = Infinity;
      let f2 = Infinity;
      for (let oy = -1; oy <= 1; oy++) {
        const row = ((gy + oy + grid) % grid) * grid;
        for (let ox = -1; ox <= 1; ox++) {
          const bucket = buckets[row + ((gx + ox + grid) % grid)];
          for (let k = 0; k < bucket.length; k++) {
            const index = bucket[k];
            let dx = Math.abs(xs[index] - x);
            let dy = Math.abs(ys[index] - y);
            if (dx > half) dx = size - dx;
            if (dy > half) dy = size - dy;
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
      height[y * size + x] = Math.min(1, (Math.sqrt(f2) - Math.sqrt(f1)) * scale);
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
  const data = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    // La fila y de la imagen (de arriba hacia abajo) va a la fila size-1-y.
    const out = (size - 1 - y) * size;
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const ny = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (out + x) * 4;
      data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  return data;
}

/** Distancia (en fracción de tesela) a la línea de rombos más cercana. */
function diamondDistance(s: number, t: number) {
  const a = s + t;
  const b = s - t;
  const da = Math.abs(a - Math.round(a));
  const db = Math.abs(b - Math.round(b));
  return Math.min(da, db) / Math.SQRT2;
}

export function buildNormalMaps(): NormalMaps {
  // Grano: tesela de 4 cm con 220 piedritas.
  const grain = heightToNormal(leatherGrain(GRAIN_SIZE, 220, 7), GRAIN_SIZE, 0.9);

  // Rombos: cada tesela es un rombo de 10 cm, acolchado y hundido en la
  // costura, con grano encima (a otra escala, también sin costura).
  const size = MAP_SIZE;
  const fine = leatherGrain(size, 900, 11);
  const diamondHeight = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = diamondDistance(x / size, y / size);
      // 0 en la costura, 1 en el centro del rombo: un cojín, no una pirámide.
      const puff = Math.sqrt(smoothstep(0.0, 0.2, d));
      diamondHeight[y * size + x] = puff * 0.9 + fine[y * size + x] * 0.05;
    }
  }
  const diamond = heightToNormal(diamondHeight, size, 7);

  // Antideslizante: puntos en hexágono cada 5 mm (20 por tesela de 10 cm).
  const gripHeight = new Float32Array(size * size);
  const rows = 20;
  const pitch = size / rows;
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / pitch);
    const offset = row % 2 === 0 ? 0 : pitch / 2;
    const cy = (row + 0.5) * pitch;
    for (let x = 0; x < size; x++) {
      const cx = (Math.floor((x - offset) / pitch) + 0.5) * pitch + offset;
      const d = Math.hypot(x - cx, y - cy) / (pitch * 0.5);
      gripHeight[y * size + x] = (1 - smoothstep(0.55, 0.85, d)) * 0.8 + fine[y * size + x] * 0.06;
    }
  }
  const grip = heightToNormal(gripHeight, size, 3.2);

  return { grain, diamond, grip };
}
