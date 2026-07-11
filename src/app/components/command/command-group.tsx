import { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'

export function CustomGroup({ children }: { children: ReactNode }) {
  return (
    <div className="mx-3 mt-3 rounded-[var(--radius-surface)]">{children}</div>
  )
}

export function CustomGroupHeader({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-2 mb-2 flex items-center justify-between rounded-[var(--radius-control)] border border-primary/40 bg-primary/12 py-2 px-3 text-[11px] font-semibold tracking-[0.06em] uppercase text-primary">
      {children}
    </div>
  )
}

type HeaderLinkProps = ComponentPropsWithoutRef<typeof Button>

export function CustomHeaderLink({
  className,
  children,
  ...props
}: HeaderLinkProps) {
  return (
    <Button
      className={cn(
        'text-[11px] p-0 m-0 h-fit underline-offset-2 normal-case tracking-normal text-primary/80 hover:text-primary',
        className,
      )}
      size="sm"
      variant="link"
      {...props}
    >
      {children}
    </Button>
  )
}
