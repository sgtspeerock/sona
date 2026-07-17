import { ListXIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/app/components/ui/button'
import { DialogTitle } from '@/app/components/ui/dialog'
import {
  usePlayerActions,
  usePlayerCurrentList,
  usePlayerCurrentSongIndex,
} from '@/store/player.store'
import { convertSecondsToHumanRead } from '@/utils/convertSecondsToTime'
import { SortableQueueList } from './sortable-queue-list'

interface QueueSongListProps {
  inFullscreenOverlay?: boolean
}

export function QueueSongList({
  inFullscreenOverlay = false,
}: QueueSongListProps) {
  const { t } = useTranslation()
  const currentList = usePlayerCurrentList()
  const currentSongIndex = usePlayerCurrentSongIndex()
  const { clearPlayerState } = usePlayerActions()

  const trackListCount = useMemo(() => currentList.length, [currentList])

  const trackListDuration = useMemo(() => {
    let minutes = 0
    currentList.forEach((song) => (minutes += song.duration))

    return convertSecondsToHumanRead(minutes)
  }, [currentList])

  return (
    <div className="flex flex-1 flex-col h-full min-w-0">
      <DialogTitle className="sr-only">{t('queue.title')}</DialogTitle>
      <div className="flex items-center justify-between h-8 mb-2 pl-3 lg:pl-4">
        <div className="flex gap-2 h-6 items-baseline opacity-65">
          <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">
            {t('queue.title')}
          </h3>
          <p className="text-xs">•</p>
          <p className="text-xs">
            {t('playlist.songCount', { count: trackListCount })}
          </p>
          <p className="text-xs">•</p>
          <p className="text-xs">
            {t('playlist.duration', { duration: trackListDuration })}
          </p>
        </div>

        <div>
          <Button
            variant="ghost"
            className="px-4 h-8 rounded-[var(--radius-control)] py-0 flex items-center justify-center hover:bg-foreground/20"
            onClick={clearPlayerState}
          >
            <ListXIcon className="mr-1 w-5 h-5" />
            <span className="text-sm">{t('queue.clear')}</span>
          </Button>
        </div>
      </div>
      <div
        className={
          inFullscreenOverlay
            ? 'w-full h-full overflow-auto pl-3 lg:pl-4 pr-2 lg:pr-3'
            : 'w-full h-full overflow-auto pl-3 lg:pl-4'
        }
      >
        <SortableQueueList
          songs={currentList}
          currentSongIndex={currentSongIndex}
          scrollToIndex={true}
          enableReorder={true}
          compact={inFullscreenOverlay}
        />
      </div>
    </div>
  )
}
