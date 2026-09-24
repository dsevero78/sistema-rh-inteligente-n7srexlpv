/* Input Component - A component that displays an input - from shadcn/ui (exposes Input) */
import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-[#D7DCE6] bg-white px-3.5 py-2 text-sm text-[#11162B] ring-offset-white transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#98A0B0] focus-visible:outline-none focus-visible:border-[#E9530E] focus-visible:ring-2 focus-visible:ring-[#E9530E]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F2F4F8]',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
