import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary/80 backdrop-blur-sm text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive/20 text-destructive border-destructive/20 [a&]:hover:bg-destructive/30",
        success:
          "border-transparent bg-emerald-500/20 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/30 dark:text-emerald-400",
        info:
          "border-transparent bg-blue-500/20 text-blue-600 border-blue-500/20 hover:bg-blue-500/30 dark:text-blue-400",
        warning:
          "border-transparent bg-amber-500/20 text-amber-600 border-amber-500/20 hover:bg-amber-500/30 dark:text-amber-400",
        premium:
          "border-transparent bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:opacity-90",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
