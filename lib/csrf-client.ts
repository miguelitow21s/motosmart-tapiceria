"use client";

// Unico lector de la cookie CSRF en el cliente. Antes estaba copiado en 4
// componentes y ya habia divergido (uno de ellos buscaba un nombre de cookie
// que la app nunca escribe). Este es el unico que debe tocarse si cambia el
// nombre de la cookie (ver middleware.ts).
export function getCsrfToken() {
  return (
    document.cookie
      .split(";")
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith("csrf-token="))
      ?.split("=")[1] ?? ""
  );
}
