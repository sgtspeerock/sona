import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SonaPanelProps = ComponentProps<'section'> & {
  elevated?: boolean
}

export function SonaPanel({
  className,
  elevated = false,
  ...props
}: SonaPanelProps) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-surface-lg)] border border-border/35 bg-card',
        elevated && 'bg-background-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function SonaSurface({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-surface-lg)] border border-border/35 bg-background-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function SonaSection({
  title,
  subtitle,
  rightSlot,
  className,
  children,
}: ComponentProps<'section'> & {
  title?: ReactNode
  subtitle?: ReactNode
  rightSlot?: ReactNode
}) {
  return (
    <SonaPanel className={cn('min-w-0 p-4', className)}>
      {(title || subtitle || rightSlot) && (
        <div className="mb-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="sona-section-title truncate">{title}</h2>}
            {subtitle && (
              <p className="sona-section-subtitle mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
      )}
      {children}
    </SonaPanel>
  )
}

export function SonaPill({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-foreground/[0.12] bg-foreground/[0.055] px-2 py-1 text-xs font-medium text-foreground/75',
        className,
      )}
      {...props}
    />
  )
}
