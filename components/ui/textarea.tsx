import { cn } from "@/lib/utils";
import { fieldClasses } from "@/components/ui/input";
import type { Ref, TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={cn(fieldClasses, "min-h-32 py-3 leading-relaxed", className)} {...props} />;
}
