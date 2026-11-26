import { integritySignature, keysEnvironment, type WompiEnvironment, type WompiKeys } from "@/lib/wompi-crypto";

/*
  Wompi del lado del servidor. Las cuatro llaves viven solo en las variables
  de entorno de Vercel (nunca en la base de datos ni en el navegador):

    WOMPI_PUBLIC_KEY        pub_prod_...   (o pub_test_... para pruebas)
    WOMPI_PRIVATE_KEY       prv_prod_...
    WOMPI_INTEGRITY_SECRET  prod_integrity_...
    WOMPI_EVENTS_SECRET     prod_events_...

  Se sacan de comercios.wompi.co > Desarrolladores. Con una sola que falte o
  que sea de otro ambiente, la tienda no muestra los botones de pago.
*/

export type WompiConfig = WompiKeys & { environment: WompiEnvironment; apiBase: string };

const API_BASE: Record<WompiEnvironment, string> = {
  test: "https://sandbox.wompi.co/v1",
  prod: "https://production.wompi.co/v1"
};

export const WOMPI_ENV_NAMES = [
  "WOMPI_PUBLIC_KEY",
  "WOMPI_PRIVATE_KEY",
  "WOMPI_INTEGRITY_SECRET",
  "WOMPI_EVENTS_SECRET"
] as const;

function readKeys(): Partial<WompiKeys> {
  const read = (name: string) => process.env[name]?.trim() || undefined;
  return {
    publicKey: read("WOMPI_PUBLIC_KEY"),
    privateKey: read("WOMPI_PRIVATE_KEY"),
    integritySecret: read("WOMPI_INTEGRITY_SECRET"),
    eventsSecret: read("WOMPI_EVENTS_SECRET")
  };
}

/** Llaves listas para usar, o null si faltan o mezclan ambientes. */
export function wompiConfig(): WompiConfig | null {
  const keys = readKeys();
  const environment = keysEnvironment(keys);
  if (!environment) return null;
  return { ...(keys as WompiKeys), environment, apiBase: API_BASE[environment] };
}

/**
 * Qué le falta a la configuración, en palabras del panel (sin mostrar las
 * llaves): los nombres de las variables vacías y si los ambientes no cuadran.
 */
export function wompiSetupStatus() {
  const keys = readKeys();
  const values = [keys.publicKey, keys.privateKey, keys.integritySecret, keys.eventsSecret];
  const missing = WOMPI_ENV_NAMES.filter((_, index) => !values[index]);
  const environment = keysEnvironment(keys);
  return {
    environment,
    missing: [...missing],
    mixed: missing.length === 0 && environment === null
  };
}

export type CheckoutCustomer = { email?: string | null; fullName?: string | null; phone?: string | null };

/**
 * Enlace del Web Checkout de Wompi: el cliente paga allá (tarjeta, PSE,
 * Nequi, Bancolombia...) y vuelve a `redirectUrl` con ?id=<transacción>.
 */
export function checkoutUrl(
  config: WompiConfig,
  { reference, amountInCents, redirectUrl, customer }: {
    reference: string;
    amountInCents: number;
    redirectUrl: string;
    customer?: CheckoutCustomer;
  }
) {
  const params = new URLSearchParams({
    "public-key": config.publicKey,
    currency: "COP",
    "amount-in-cents": String(amountInCents),
    reference,
    "signature:integrity": integritySignature(reference, amountInCents, "COP", config.integritySecret),
    "redirect-url": redirectUrl
  });
  const email = customer?.email?.trim();
  if (email) params.set("customer-data:email", email);
  const name = customer?.fullName?.trim();
  if (name) params.set("customer-data:full-name", name);
  const phone = customer?.phone?.replace(/\D/g, "");
  if (phone && phone.length >= 7) {
    // Wompi pide el número sin el indicativo, que va aparte.
    const local = phone.startsWith("57") && phone.length === 12 ? phone.slice(2) : phone;
    params.set("customer-data:phone-number", local);
    params.set("customer-data:phone-number-prefix", "+57");
  }
  return `https://checkout.wompi.co/p/?${params.toString()}`;
}

export type WompiTransaction = {
  id: string;
  reference: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  amount_in_cents: number;
  currency: string;
  payment_method_type: string | null;
};

const STATUSES = new Set(["PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR"]);

/** Transacción tal como la manda Wompi (en un evento o en la consulta), o null si no tiene la forma esperada. */
export function parseTransaction(raw: unknown): WompiTransaction | null {
  if (!raw || typeof raw !== "object") return null;
  const tx = raw as Record<string, unknown>;
  if (typeof tx.id !== "string" || typeof tx.reference !== "string") return null;
  if (typeof tx.status !== "string" || !STATUSES.has(tx.status)) return null;
  const amount = Number(tx.amount_in_cents);
  if (!Number.isSafeInteger(amount)) return null;
  return {
    id: tx.id,
    reference: tx.reference,
    status: tx.status as WompiTransaction["status"],
    amount_in_cents: amount,
    currency: typeof tx.currency === "string" ? tx.currency : "",
    payment_method_type: typeof tx.payment_method_type === "string" ? tx.payment_method_type : null
  };
}

/**
 * Consulta una transacción directo a Wompi (no se confía en lo que diga la
 * URL de regreso). null si no existe o Wompi no responde.
 */
export async function fetchTransaction(config: WompiConfig, id: string) {
  if (!/^[\w-]{6,80}$/.test(id)) return null;
  try {
    const res = await fetch(`${config.apiBase}/transactions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${config.privateKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as { data?: unknown } | null;
    return parseTransaction(body?.data);
  } catch (error) {
    console.error("wompi fetchTransaction", error instanceof Error ? error.message : error);
    return null;
  }
}
