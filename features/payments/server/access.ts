import { getCurrentUserRole, isAdmin } from "@/lib/auth";
import { paymentsMode } from "@/lib/feature-flags";

export type PayAccess = { ok: boolean; test: boolean };

/**
 * ¿Puede pagar quien abre la página? Con llaves de producción, cualquiera.
 * Con las de pruebas, solo el administrador con sesión abierta: las tarjetas
 * de prueba de Wompi son públicas y cualquiera dejaría pedidos «pagados».
 * Lee la sesión: solo para páginas dinámicas y Server Actions.
 */
export async function payAccess(): Promise<PayAccess> {
  const mode = await paymentsMode();
  if (mode === "live") return { ok: true, test: false };
  if (mode === "off") return { ok: false, test: false };
  const role = await getCurrentUserRole()
    .then((result) => result.role)
    .catch(() => null);
  return { ok: isAdmin(role), test: true };
}

export const TEST_MODE_NOTE =
  "Modo de pruebas: paga con las tarjetas de prueba de Wompi (no se cobra nada). Solo tú lo ves porque tienes la sesión del panel abierta.";
