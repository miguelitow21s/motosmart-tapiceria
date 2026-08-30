import { NextResponse } from "next/server";
import type { ZodError } from "zod";

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
