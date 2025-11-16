import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 border-primary/30 text-primary-foreground hover:bg-primary/20 hover:border-primary/40 hover:shadow-[0_0_12px_rgba(14,165,233,0.3)]",
        secondary:
          "bg-secondary/10 border-secondary/30 text-secondary-foreground hover:bg-secondary/20 hover:border-secondary/40 hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]",
        destructive:
          "bg-destructive/10 border-destructive/30 text-destructive-foreground hover:bg-destructive/20 hover:border-destructive/40 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]",
        outline: "bg-background/5 border-border text-foreground hover:bg-background/10 hover:border-border/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
