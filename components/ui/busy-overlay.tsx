import { Loader2 } from "lucide-react";

// Pantalla de espera del panel mientras se guarda o se sube algo. Cubre todo
// (incluidos los modales, z-[80]) para que no se pueda volver a pulsar
// "Guardar": antes no habia ninguna señal de que algo estuviera pasando y se
// pulsaba varias veces.
export function BusyOverlay({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-white/15 bg-neutral-950 px-6 py-8 text-center shadow-card"
      >
        <Loader2 aria-hidden="true" className="h-10 w-10 text-orange-400 motion-safe:animate-spin" />
        <p className="font-display text-lg text-white">{text}</p>
        <p className="text-sm text-neutral-300">Espera un momento, no cierres esta ventana.</p>
      </div>
    </div>
  );
}
