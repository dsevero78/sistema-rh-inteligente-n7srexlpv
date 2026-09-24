/* Badge Component primitives - A component that displays a badge - from shadcn/ui (exposes Badge, badgeVariants) */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#FEF1EA] text-[#E9530E] border-[#FBDCC9]',
        secondary: 'border-transparent bg-[#ECEEF4] text-[#212B55] border-[#D3D7E5]',
        destructive: 'border-transparent bg-[#F8DDD9] text-[#D5392C] border-[#f1b4ac]',
        outline: 'border-[#D7DCE6] text-[#212B55] bg-white',
        success: 'border-transparent bg-[#DDF3E8] text-[#1F9D6A] border-[#b8e4cf]',
        warning: 'border-transparent bg-[#FBF1D2] text-[#9A6F00] border-[#f5df9a]',
        info: 'border-transparent bg-[#DCE6FA] text-[#345EA9] border-[#b4ccf4]',
        brand: 'border-transparent bg-[#E9530E] text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
