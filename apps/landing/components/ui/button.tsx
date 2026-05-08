import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Stripe-style buttons. Filled = Deep Violet, Ghost = transparent text,
 * Outlined = washed-violet border. 4px radius (per Stripe spec). Tight padding.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-violet text-platinum hover:bg-violet-shadow hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgba(83,58,253,0.45)]",
        secondary:
          "bg-platinum text-midnight border border-violet-washed hover:border-violet hover:text-violet",
        ghost:
          "bg-transparent text-midnight hover:text-violet",
        link:
          "bg-transparent text-violet underline-offset-4 hover:underline px-0"
      },
      size: {
        sm: "h-9 px-4 text-[14px]",
        md: "h-11 px-5 text-[14px]",
        lg: "h-12 px-6 text-[14px]"
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
