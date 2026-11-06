import { Loader2 } from "lucide-react";

// Pantalla de espera del panel mientras se guarda o se sube algo. Cubre todo
// (también los diálogos, z-80) para que no se pueda volver a pulsar "Guardar":
// antes no había ninguna señal de que algo estuviera pasando y se pulsaba
// varias veces.
export function BusyOverlay({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-ink/45 p-6">
      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-xs flex-col items-center gap-3 rounded-xl bg-bg px-6 py-7 text-center shadow-float"
      >
        <Loader2 aria-hidden="true" className="size-8 text-ink motion-safe:animate-spin" />
        <p className="text-lg font-semibold text-ink">{text}</p>
        <p className="text-sm text-ink-2">No cierres esta ventana.</p>
      </div>
    </div>
  );
}
