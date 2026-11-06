"use client";

import { readApiError } from "@/lib/api-error-client";
import { getCsrfToken } from "@/lib/csrf-client";

/*
  Única puerta del panel hacia /api/admin. Pone el token CSRF, lee siempre el
  error con readApiError (también cuando la respuesta no es JSON, como el 413
  de Vercel) y nunca lanza: devuelve { ok, data } o { ok: false, error } con un
  mensaje que la administradora puede leer.

  La ruta de demostración (app/panel-demo) cambia el transporte por uno en
  memoria para revisar el panel sin tocar la base de datos real.
*/

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

type Transport = (path: string, init: RequestInit) => Promise<Response>;

const network: Transport = (path, init) => fetch(path, init);
let transport: Transport = network;

export function setAdminTransport(next: Transport) {
  transport = next;
}

/** Vuelve a la red: al salir de la demostración, /admin no debe seguir en memoria. */
export function resetAdminTransport() {
  transport = network;
}

const OFFLINE = "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.";

async function readBody<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

export async function adminGet<T>(path: string, fallback: string): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await transport(path, { cache: "no-store" });
  } catch {
    return { ok: false, error: OFFLINE, status: 0 };
  }
  if (!res.ok) return { ok: false, error: await readApiError(res, fallback), status: res.status };
  return { ok: true, data: await readBody<T>(res) };
}

export async function adminSend<T = Record<string, unknown>>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  fallback: string
): Promise<ApiResult<T>> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = { "x-csrf-token": getCsrfToken() };
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await transport(path, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body)
    });
  } catch {
    return { ok: false, error: OFFLINE, status: 0 };
  }
  if (!res.ok) return { ok: false, error: await readApiError(res, fallback), status: res.status };
  return { ok: true, data: await readBody<T>(res) };
}
