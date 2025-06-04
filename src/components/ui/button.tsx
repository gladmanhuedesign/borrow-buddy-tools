
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "glass-button text-primary-foreground hover:shadow-xl hover:scale-105 bg-gradient-to-r from-blue-500/80 to-purple-500/80 backdrop-blur-sm border-0",
        destructive:
          "glass-button bg-gradient-to-r from-red-500/80 to-pink-500/80 text-destructive-foreground hover:shadow-xl hover:scale-105 border-0",
        outline:
          "glass-button border border-white/30 bg-white/10 hover:bg-white/20 hover:text-accent-foreground hover:shadow-xl",
        secondary:
          "glass-button bg-white/15 text-secondary-foreground hover:bg-white/25 hover:shadow-xl hover:scale-105",
        ghost: "hover:bg-white/20 hover:text-accent-foreground rounded-lg transition-all duration-300",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
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
