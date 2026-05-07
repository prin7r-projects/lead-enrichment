import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] font-semibold leading-none",
  {
    variants: {
      tone: {
        neutral: "bg-surface-raised text-ink-muted border border-border",
        signal: "bg-signal/10 text-signal border border-signal/30",
        ok: "bg-ok/10 text-ok border border-ok/30",
        warn: "bg-warn/10 text-warn border border-warn/30",
        err: "bg-err/10 text-err border border-err/30"
      }
    },
    defaultVariants: { tone: "neutral" }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
