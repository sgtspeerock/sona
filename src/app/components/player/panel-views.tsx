import { LyricsTab } from '@/app/components/fullscreen/lyrics'
import { useFullscreenLuminance } from '@/app/components/fullscreen/luminance-context'
import { CurrentSongInfo } from '@/app/components/queue/current-song-info'
import { QueueSongList } from '@/app/components/queue/song-list'
import { cn } from '@/lib/utils'

interface QueuePanelViewProps {
  inFullscreenOverlay?: boolean
}

export function QueuePanelView({
  inFullscreenOverlay = false,
}: QueuePanelViewProps) {
  const { useDarkForeground } = useFullscreenLuminance()

  return (
    <div
      className={cn(
        'flex w-full h-full gap-6',
        inFullscreenOverlay &&
          'items-stretch rounded-[var(--radius-surface-lg)] border border-border/25 bg-background/92 p-4',
        inFullscreenOverlay &&
          (useDarkForeground
            ? 'fullscreen-panel-readable-light-bg'
            : 'fullscreen-panel-readable-dark-bg'),
        !inFullscreenOverlay && 'sona-shell p-4',
      )}
    >
      <div
        className={cn(
          'shrink-0',
          inFullscreenOverlay && 'p-0',
        )}
      >
        <CurrentSongInfo />
      </div>
      <div
        className={cn(
          'flex-1 min-w-0',
          inFullscreenOverlay && 'p-0',
        )}
      >
        <QueueSongList inFullscreenOverlay={inFullscreenOverlay} />
      </div>
    </div>
  )
}

export function LyricsPanelView({
  inFullscreenOverlay = false,
}: {
  inFullscreenOverlay?: boolean
}) {
  const { useDarkForeground } = useFullscreenLuminance()

  return (
    <div
      className={cn(
        'w-full h-full',
        inFullscreenOverlay &&
          'rounded-[var(--radius-surface-lg)] border border-border/25 bg-background/92 p-5',
        !inFullscreenOverlay && 'sona-shell p-4',
        inFullscreenOverlay &&
          (useDarkForeground
            ? 'fullscreen-panel-readable-light-bg'
            : 'fullscreen-panel-readable-dark-bg'),
      )}
    >
      <LyricsTab />
    </div>
  )
}
