import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "card-overlay rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_12px_28px_rgba(0,0,0,0.28)]",
        className
      )}
      {...props}
    />
  );
}
