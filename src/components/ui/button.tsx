import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium tracking-[-0.005em] ring-offset-paper transition-[transform,background,color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-paper border border-ink hover:bg-ink-2 hover:border-ink-2 rounded",
        iron:
          "bg-iron text-white border border-iron hover:opacity-90 rounded",
        outline:
          "bg-transparent text-ink border border-hairline-strong hover:border-ink rounded",
        ghost:
          "bg-transparent text-ink hover:bg-paper-2 border border-transparent rounded",
        secondary:
          "bg-paper-2 text-ink border border-hairline hover:border-hairline-strong rounded",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive hover:opacity-90 rounded",
        link:
          "text-ink underline underline-offset-4 decoration-hairline-strong hover:decoration-ink border-0 rounded-none px-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-sm",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
