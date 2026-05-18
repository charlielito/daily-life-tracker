import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded border border-hairline bg-surface px-3.5 py-2 text-[15px] text-ink ring-offset-paper transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-2 focus-visible:outline-none focus-visible:border-ink focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
