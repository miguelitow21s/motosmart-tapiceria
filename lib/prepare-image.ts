// Solo navegador. Reduce la foto antes de subirla desde el panel.
//
// Por que: en Vercel una funcion rechaza cualquier peticion de mas de 4.5 MB
// con un 413 que ni siquiera llega a la API, y una foto de celular pesa
// facilmente 3-8 MB. La subida fallaba sin mensaje. Una foto de 2000 px de
// lado mayor se ve igual de nitida en la web y pesa una fraccion.

const MAX_SIDE_PX = 2000;
const TARGET_MAX_BYTES = 3.5 * 1024 * 1024;
const SERVER_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImageForUpload(file: File): Promise<File> {
  const alreadyFine = SERVER_ALLOWED_TYPES.has(file.type) && file.size <= TARGET_MAX_BYTES;

  let bitmap: ImageBitmap;
  try {
    // Explicito: las fotos de celular traen la rotacion en EXIF, y al
    // redibujarlas en un canvas esa informacion se pierde.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // No se puede decodificar aqui (formato raro): que decida el servidor.
    return file;
  }

  try {
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
    if (alreadyFine && scale === 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // PNG suele ser un logo con transparencia: WebP la conserva; JPEG no.
    const preferred = file.type === "image/png" ? "image/webp" : "image/jpeg";
    let blob = await canvasToBlob(canvas, preferred, 0.85);
    if (!blob || blob.type !== preferred) blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
    if (!blob || blob.size >= file.size) return file;

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^/.]+$/, "") || "foto";
    return new File([blob], `${baseName}.${extension}`, { type: blob.type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
