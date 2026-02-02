import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary/20 selection:text-foreground',
        'border-2 border-input bg-background/50 backdrop-blur-sm',
        'h-11 w-full min-w-0 rounded-xl px-4 py-2 text-base',
        'shadow-sm transition-all duration-200 outline-none',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'md:text-sm',
        'hover:border-border/80',
        'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-soft',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
