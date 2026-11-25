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
import { GRAIN_SIZE, MAP_SIZE, buildNormalMaps, type NormalMaps } from "./texture-data";

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
