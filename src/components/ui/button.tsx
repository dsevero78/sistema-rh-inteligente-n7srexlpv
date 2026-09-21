/* Button Component primitives - A component that displays a button - from shadcn/ui (exposes Button, buttonVariants) */
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9530E] focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[#E9530E] text-white hover:bg-[#C5430A] shadow-xs hover:shadow-md active:bg-[#9B340A]',
        destructive: 'bg-[#D5392C] text-white hover:bg-[#b52a1e] shadow-xs',
        outline:
          'border border-[#D7DCE6] bg-white text-[#212B55] hover:bg-[#F2F4F8] hover:border-[#BFC5D2] shadow-xs',
        secondary: 'bg-[#212B55] text-white hover:bg-[#2E3A6E] shadow-xs',
        ghost: 'text-[#212B55] hover:bg-[#FEF1EA] hover:text-[#E9530E]',
        link: 'text-[#212B55] underline-offset-4 hover:underline hover:text-[#E9530E] p-0 h-auto',
        brand: 'bg-[#E9530E] text-white hover:bg-[#C5430A] shadow-xs',
        navy: 'bg-[#212B55] text-white hover:bg-[#2E3A6E] shadow-xs',
        quiet: 'text-[#6B7384] hover:text-[#212B55] hover:bg-[#F2F4F8]',
      },
      size: {
        default: 'h-10 px-4 py-2 rounded-lg text-sm',
        sm: 'h-8 rounded-lg px-3 text-xs',
        md: 'h-10 px-4 py-2 rounded-lg text-sm',
        lg: 'h-12 rounded-lg px-6 text-base font-bold',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
