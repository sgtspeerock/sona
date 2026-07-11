import { useFullscreenLuminance } from '@/app/components/fullscreen/luminance-context'
import { LyricsTab } from '@/app/components/fullscreen/lyrics'
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
          'items-stretch rounded-[var(--radius-surface-lg)] backdrop-blur-xl p-4 shadow-[0_32px_64px_rgba(0,0,0,0.36)] transition-all duration-300',
        inFullscreenOverlay &&
          (useDarkForeground
            ? 'bg-white/48 text-neutral-900 fullscreen-panel-readable-light-bg'
            : 'bg-white/8 text-white fullscreen-panel-readable-dark-bg'),
        !inFullscreenOverlay && 'sona-shell p-4',
      )}
    >
      <div className={cn('shrink-0', inFullscreenOverlay && 'p-0')}>
        <CurrentSongInfo />
      </div>
      <div className={cn('flex-1 min-w-0', inFullscreenOverlay && 'p-0')}>
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
          'rounded-[var(--radius-surface-lg)] backdrop-blur-xl p-5 shadow-[0_32px_64px_rgba(0,0,0,0.36)] transition-all duration-300',
        !inFullscreenOverlay && 'sona-shell p-4',
        inFullscreenOverlay &&
          (useDarkForeground
            ? 'bg-white/48 text-neutral-900 fullscreen-panel-readable-light-bg'
            : 'bg-white/8 text-white fullscreen-panel-readable-dark-bg'),
      )}
    >
      <LyricsTab />
    </div>
  )
}
