import Image from "next/image";
import { cn } from "@/lib/utils";

export function LogoGlow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "logo-glow rounded-2xl border border-red-500/45 bg-black/60 px-3 py-2 shadow-[0_0_28px_rgba(239,68,68,0.18)]",
        className
      )}
    >
      <Image
        src="/logo-motosmart.png"
        alt="MotoSmart Tapiceria"
        width={946}
        height={446}
        className="h-10 w-auto md:h-11"
        priority
      />
    </div>
  );
}
