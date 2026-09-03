import * as React from 'react'
import { cn } from '../../lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials: string
}

function Avatar({ initials, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold w-9 h-9 shrink-0',
        className
      )}
      {...props}
    >
      {initials}
    </div>
  )
}

export { Avatar }
