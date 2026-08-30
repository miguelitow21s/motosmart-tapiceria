import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
  ref?: React.Ref<React.ElementRef<typeof LabelPrimitive.Root>>;
};

// React 19 ya no requiere forwardRef: ref se recibe como una prop normal.
function Label({ className, ref, ...props }: LabelProps) {
  return <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium text-white", className)} {...props} />;
}

export { Label };
