// Convierte la respuesta de error de una API del panel en un mensaje que la
// administradora pueda entender y corregir. Antes el panel mostraba
// "Invalid payload" o un generico "No se pudo guardar" y no habia forma de
// saber que campo fallaba; y si la respuesta no era JSON (p. ej. el 413 de
// Vercel por foto muy pesada) el res.json() lanzaba y no salia ningun aviso.

const KNOWN_ERRORS: Record<string, string> = {
  Forbidden: "Tu sesión expiró o no tienes permiso. Vuelve a iniciar sesión.",
  "CSRF invalido": "La sesión del panel expiró. Recarga la página e intenta de nuevo.",
  "Feature disabled": "La subida de fotos está apagada. Actívala en Feature Flags > admin_uploads_enabled.",
  "File required": "Elige una foto antes de subir.",
  "Error interno": "Error interno del servidor. Intenta de nuevo en un momento."
};

export async function readApiError(res: Response, fallback: string): Promise<string> {
  if (res.status === 413) return "La foto pesa demasiado. Prueba con una foto más liviana (menos de 4 MB).";
  try {
    const body = (await res.json()) as { error?: string; detail?: Array<{ message?: string }> };
    const details = (body.detail ?? []).map((issue) => issue.message).filter(Boolean);
    if (details.length > 0) return details.join(" · ");
    if (body.error) return KNOWN_ERRORS[body.error] ?? body.error;
  } catch {
    // Respuesta sin JSON: se usa el mensaje por defecto.
  }
  return fallback;
}
