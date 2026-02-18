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
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export function sanitizeText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
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
