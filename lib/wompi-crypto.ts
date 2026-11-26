import { createHash, timingSafeEqual } from "node:crypto";

/*
  Firmas de Wompi, sin nada más: ni variables de entorno ni red. Así se
  prueban solas (lib/wompi-crypto.test.ts, con los ejemplos de la
  documentación de Wompi).
*/

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

/**
 * Firma de integridad del Web Checkout: SHA-256 de
 * referencia + monto en centavos + moneda + secreto de integridad.
 * Sin ella Wompi rechaza el pago, y con ella nadie puede cambiar el monto en
 * el enlace: la firma deja de cuadrar.
 */
export function integritySignature(reference: string, amountInCents: number, currency: string, secret: string) {
  return sha256(`${reference}${amountInCents}${currency}${secret}`);
}

/** Lee "transaction.amount_in_cents" dentro de `data` del evento. */
function readPath(data: unknown, path: string): unknown {
  let node: unknown = data;
  for (const part of path.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

export type WompiEvent = {
  event?: unknown;
  data?: unknown;
  environment?: unknown;
  signature?: { properties?: unknown; checksum?: unknown };
  timestamp?: unknown;
};

/**
 * Checksum de un evento: SHA-256 de los valores de signature.properties (en
 * su orden, leídos dentro de `data`) + timestamp + secreto de eventos.
 */
export function eventChecksum(event: WompiEvent, secret: string): string | null {
  const properties = event.signature?.properties;
  if (!Array.isArray(properties) || properties.length === 0) return null;
  if (typeof event.timestamp !== "number" && typeof event.timestamp !== "string") return null;
  let text = "";
  for (const property of properties) {
    if (typeof property !== "string") return null;
    const value = readPath(event.data, property);
    if (value === undefined || value === null || typeof value === "object") return null;
    text += String(value);
  }
  return sha256(`${text}${event.timestamp}${secret}`);
}

/**
 * ¿El evento lo firmó Wompi con nuestro secreto? Compara contra el checksum
 * del cuerpo y, si llega, contra la cabecera X-Event-Checksum. Wompi lo
 * muestra en mayúsculas en la documentación: se compara sin distinguir.
 */
export function verifyEvent(event: WompiEvent, secret: string, header?: string | null): boolean {
  const expected = eventChecksum(event, secret);
  if (!expected) return false;
  const candidates = [event.signature?.checksum, header].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  if (candidates.length === 0) return false;
  return candidates.every((candidate) => sameHex(candidate, expected));
}

function sameHex(a: string, b: string) {
  const left = Buffer.from(a.toLowerCase(), "utf8");
  const right = Buffer.from(b.toLowerCase(), "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export type WompiEnvironment = "test" | "prod";

export type WompiKeys = {
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
};

/**
 * Las cuatro llaves deben ser del mismo ambiente (pruebas o producción): una
 * llave pública de producción con un secreto de pruebas daría pagos que
 * Wompi rechaza o eventos que nunca cuadran. null si faltan o no cuadran.
 */
export function keysEnvironment(keys: Partial<WompiKeys>): WompiEnvironment | null {
  const { publicKey, privateKey, integritySecret, eventsSecret } = keys;
  if (!publicKey || !privateKey || !integritySecret || !eventsSecret) return null;
  for (const env of ["test", "prod"] as const) {
    if (
      publicKey.startsWith(`pub_${env}_`) &&
      privateKey.startsWith(`prv_${env}_`) &&
      integritySecret.startsWith(`${env}_integrity_`) &&
      eventsSecret.startsWith(`${env}_events_`)
    ) {
      return env;
    }
  }
  return null;
}
