import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-signal text-[color:var(--surface)] hover:bg-signal-shadow hover:-translate-y-px transition-transform",
        secondary:
          "bg-transparent text-ink border border-border hover:bg-surface-raised hover:border-ink-muted",
        ghost: "bg-transparent text-ink hover:text-signal",
        link: "bg-transparent text-signal underline-offset-4 hover:underline px-0"
      },
      size: {
        sm: "h-9 px-3 text-caption",
        md: "h-11 px-5 text-body",
        lg: "h-12 px-6 text-body"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }
);
Button.displayName = "Button";

export { buttonVariants };
