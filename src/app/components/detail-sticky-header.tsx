import { ReactNode } from 'react'
import { ShadowHeader } from '@/app/components/album/shadow-header'
import { HeaderTitle } from '@/app/components/header-title'
import { cn } from '@/lib/utils'

type DetailStickyHeaderProps = {
  title: string
  count?: number
  loading?: boolean
  rightSlot?: ReactNode
  className?: string
  fixed?: boolean
  showGlassEffect?: boolean
}

export function DetailStickyHeader({
  title,
  count,
  loading = false,
  rightSlot,
  className,
  fixed = true,
  showGlassEffect = false,
}: DetailStickyHeaderProps) {
  return (
    <ShadowHeader
      fixed={fixed}
      showGlassEffect={showGlassEffect}
      className={cn(
        'w-full justify-between items-center',
        className,
      )}
    >
      <HeaderTitle title={title} count={count} loading={loading} />
      {rightSlot ? (
        <div className="flex gap-2 flex-1 justify-end">{rightSlot}</div>
      ) : null}
    </ShadowHeader>
  )
}
