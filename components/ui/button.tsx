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
        default:
          "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(255,30,30,0.35)] hover:scale-[1.02] hover:bg-[#ff3b3b]",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, children, onPointerDown, ...props }, ref) => {
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
);
Button.displayName = "Button";

export { Button, buttonVariants };
