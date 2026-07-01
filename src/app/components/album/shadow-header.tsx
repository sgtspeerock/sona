import { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type ShadowHeaderProps = ComponentProps<'div'> & {
  showGlassEffect?: boolean
  fixed?: boolean
}

export function ShadowHeader({
  children,
  className,
  showGlassEffect = true,
  fixed = true,
  ...rest
}: ShadowHeaderProps) {
  return (
    <div
      className={cn(
        'flex min-h-[--shadow-header-height] items-center justify-start border-b border-border/30 bg-transparent px-8 py-4',
        fixed && 'sticky top-0 left-0 right-0 z-10',
        showGlassEffect &&
          'backdrop-blur-lg supports-[backdrop-filter]:bg-background/72',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
