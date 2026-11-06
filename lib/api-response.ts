import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * Cuerpo JSON de la petición, o undefined si no es JSON válido. Así un cuerpo
 * roto termina en 400 (el schema lo rechaza) y no en un 500 sin explicación.
 */
export function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => undefined);
}

export function invalidPayload(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid payload",
      detail: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    },
    { status: 400 }
  );
}

// No devolver nunca error.message de Postgres/Storage al cliente: filtra
// nombres de constraint, tabla y columna a quien ya tiene sesion en el panel.
export function internalError(context: string, error: unknown) {
  console.error(context, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
