import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        pendiente: 'bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending-text)]',
        aprobada: 'bg-[var(--color-status-approved-bg)] text-[var(--color-status-approved-text)]',
        rechazada: 'bg-[var(--color-status-rejected-bg)] text-[var(--color-status-rejected-text)]',
        Programado: 'bg-[var(--color-status-scheduled-bg)] text-[var(--color-status-scheduled-text)]',
        Activo: 'bg-[var(--color-status-active-bg)] text-[var(--color-status-active-text)]',
        Vencido: 'bg-[var(--color-status-expired-bg)] text-[var(--color-status-expired-text)]',
        default: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
