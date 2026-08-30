"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Antes bg-primary (#ff1e1e) con texto blanco: 3.84:1, por debajo
        // del 4.5:1 minimo de WCAG AA para texto de 14px. #CC0000 mantiene
        // el rojo de marca y da ~5.9:1; el hover oscurece en vez de aclarar
        // (~7.2:1) para no volver a caer por debajo en ese estado.
        default:
          "bg-[#CC0000] text-primary-foreground shadow-[0_0_20px_rgba(255,30,30,0.35)] hover:scale-[1.02] hover:bg-[#B30000]",
        secondary:
          "border border-white/20 bg-white/5 text-white hover:bg-white/10"
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4",
        lg: "h-12 px-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

// React 19 ya no requiere forwardRef: ref se recibe como una prop normal.
function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  children,
  onPointerDown,
  ref,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    onPointerDown?.(event as unknown as React.PointerEvent<HTMLButtonElement>);
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    target.style.setProperty("--ripple-x", `${event.clientX - rect.left}px`);
    target.style.setProperty("--ripple-y", `${event.clientY - rect.top}px`);
  };

  return (
    <Comp
      className={cn(
        buttonVariants({ variant, size }),
        "btn-ripple relative overflow-hidden active:scale-[0.98]",
        className
      )}
      ref={ref}
      aria-busy={isLoading}
      disabled={props.disabled || isLoading}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Cargando...
        </span>
      ) : (
        children
      )}
    </Comp>
  );
}
Button.displayName = "Button";

export { Button, buttonVariants };
