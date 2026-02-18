import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-400 focus:border-primary",
        className
      )}
      {...props}
    />
  );
}
