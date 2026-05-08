import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status pills. Restrained on a white canvas: low-saturation fills with
 * matching ink-on-tint instead of bright outlines on a dark surface.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2 py-[3px] font-mono text-[11px] uppercase tracking-[0.08em] font-medium leading-none",
  {
    variants: {
      tone: {
        neutral: "bg-powder text-slate",
        signal: "bg-violet/10 text-violet",
        ok: "bg-[#E6F4EC] text-[#117A4D]",
        warn: "bg-[#FFF1DC] text-[#B45A09]",
        err: "bg-[#FDE7E5] text-[#B3261E]",
        outline: "bg-transparent text-violet border border-violet-washed"
      }
    },
    defaultVariants: { tone: "neutral" }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
