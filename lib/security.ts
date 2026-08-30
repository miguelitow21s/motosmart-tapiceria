import { z } from "zod";

export const customOrderSchema = z.object({
  brand: z.string().min(2).max(60),
  design: z.string().min(2).max(60),
  baseColor: z.string().min(2).max(30),
  material: z.string().min(2).max(30),
  seamColor: z.string().min(2).max(30),
  embroideryText: z.string().max(30),
  foam: z.enum(["original", "modificada"])
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(1).max(72)
});

// Antes escapaba entidades HTML aqui (en la entrada). Eso no protege de nada
// que React no proteja ya al renderizar texto (escapa en la salida por
// defecto), y en cambio corrompia los datos guardados: un nombre como
// "Bajaj & TVS" se guardaba como "Bajaj &amp; TVS" y se re-escapaba en cada
// edicion posterior. Ahora solo normaliza espacios.
export function sanitizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function assertCsrf(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const csrfCookie = cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith("csrf-token="))
    ?.split("=")[1];

  const csrfHeader = request.headers.get("x-csrf-token");
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    throw new Error("Invalid CSRF token");
  }
}
