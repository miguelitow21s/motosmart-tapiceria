import Image from "next/image";
import logoMotosmart from "@/styles/Logo/logo_motosmart.svg";
import { cn } from "@/lib/utils";

export function LogoGlow({ className }: { className?: string }) {
  const logoSrc = typeof logoMotosmart === "string" ? logoMotosmart : logoMotosmart.src;

  return (
    <div
      className={cn(
        "animate-glow rounded-2xl border border-red-500/45 bg-black/60 px-3 py-2 shadow-[0_0_28px_rgba(239,68,68,0.18)]",
        className
      )}
    >
      <Image
        src={logoSrc}
        alt="MotoSmart Tapiceria"
        width={236}
        height={136}
        className="h-10 w-auto brightness-0 invert md:h-11"
        priority
        unoptimized
      />
    </div>
  );
}
