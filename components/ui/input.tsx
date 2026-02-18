import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-white/15 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/35 focus:shadow-[0_0_0_6px_rgba(255,30,30,0.08)] aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-400/25 data-[state=success]:border-emerald-400 data-[state=success]:ring-2 data-[state=success]:ring-emerald-400/20",
        className
      )}
      {...props}
    />
  );
}
