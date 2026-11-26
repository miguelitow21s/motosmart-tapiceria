/* Genera los mapas de normales fuera del hilo principal (ver texture-data.ts). */
import { buildNormalMaps } from "./texture-data";

const scope = self as unknown as {
  onmessage: (() => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

scope.onmessage = () => {
  const maps = buildNormalMaps();
  scope.postMessage(maps, [
    maps.grain.buffer,
    maps.diamond.buffer,
    maps.grip.buffer,
    maps.grit.buffer,
    maps.suede.buffer
  ]);
};
