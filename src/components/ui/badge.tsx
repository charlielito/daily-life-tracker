import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-[11px] font-medium tracking-[0.04em] uppercase",
  {
    variants: {
      variant: {
        default:
          "border-hairline bg-paper-2 text-ink",
        secondary:
          "border-hairline bg-surface text-muted",
        iron:
          "border-iron bg-iron-soft text-iron",
        destructive:
          "border-destructive bg-destructive/10 text-destructive",
        outline:
          "border-hairline-strong bg-transparent text-ink",
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
