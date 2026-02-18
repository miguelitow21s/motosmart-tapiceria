import { cn } from "@/lib/utils";

export function LogoGlow({ className }: { className?: string }) {
  return (
    <div className={cn("animate-glow rounded-2xl border border-red-500/50 bg-black/60 px-4 py-2", className)}>
      <span className="font-display text-lg tracking-wide text-white">
        MotoSmart <span className="text-primary">Tapiceria</span>
      </span>
    </div>
  );
}
