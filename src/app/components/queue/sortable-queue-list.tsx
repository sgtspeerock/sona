import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useVirtualizer } from '@tanstack/react-virtual'
import clsx from 'clsx'
import {
  Disc3Icon,
  GripVerticalIcon,
  Mic2Icon,
  MoonStarIcon,
  MusicIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react'
import {
  CSSProperties,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import PlaySongButton from '@/app/components/table/play-button'
import { QueueActions } from '@/app/components/table/queue-actions'
import { TableSongTitle } from '@/app/components/table/song-title'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/app/components/ui/context-menu'
import {
  ScrollArea,
  scrollAreaViewportSelector,
} from '@/app/components/ui/scroll-area'
import { ROUTES } from '@/routes/routesList'
import { usePlayerActions, usePlayerStore } from '@/store/player.store'
import { ISong } from '@/types/responses/song'
import { convertSecondsToTime } from '@/utils/convertSecondsToTime'

interface RowContentProps {
  song: ISong
  songIndex: number
  songs: ISong[]
  currentSongId?: string
  sortingEnabled: boolean
  isDragging: boolean
  isOverlay?: boolean
  compact?: boolean
  dragAttributes?: Record<string, unknown>
  dragListeners?: Record<string, unknown>
}

function QueueRowContentBase({
  song,
  songIndex,
  songs,
  currentSongId,
  sortingEnabled,
  isDragging,
  isOverlay = false,
  compact = false,
  dragAttributes,
  dragListeners,
}: RowContentProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { removeSongFromQueue, setSongList } = usePlayerActions()
  const { closeDrawer } = usePlayerStore.getState().actions

  const isActive = song.id === currentSongId
  const sourceLabel =
    song.queueSource === 'dj'
      ? t('queue.source.dj')
      : song.queueSource === 'session'
        ? t('queue.source.session')
        : null

  if (compact) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            {...(sortingEnabled && !isOverlay
              ? { ...dragAttributes, ...dragListeners }
              : {})}
            className={clsx(
              'group/tablerow relative w-full flex flex-row items-center rounded-md h-14 transition-colors select-none',
              sortingEnabled && !isOverlay && 'cursor-grab active:cursor-grabbing',
              isDragging && !isOverlay
                ? 'opacity-20 bg-foreground/5'
                : 'hover:bg-foreground/20',
              isOverlay &&
                'shadow-xl border border-foreground/20 bg-popover cursor-grabbing',
              isActive &&
                !isDragging &&
                'row-active bg-foreground/20',
            )}
            onClick={() => {
              if (song.id !== currentSongId) {
                setSongList(songs, songIndex)
              }
            }}
          >
            <div className="relative ml-2 h-10 w-10 min-w-10 overflow-hidden rounded-md border border-border/30 bg-muted">
              {song.coverArt ? (
                <ImageLoader id={song.coverArt} type="album" size="120">
                  {(src) =>
                    src ? (
                      <img
                        src={src}
                        alt={song.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null
                  }
                </ImageLoader>
              ) : null}
              {!isOverlay && song.queueSource === 'dj' && (
                <span className="absolute bottom-0 right-0 inline-flex h-4 w-4 items-center justify-center rounded-tl bg-background/85 text-foreground/70">
                  <SparklesIcon className="h-3 w-3" title={sourceLabel ?? undefined} />
                </span>
              )}
              {!isOverlay && song.queueSource === 'session' && (
                <span className="absolute bottom-0 right-0 inline-flex h-4 w-4 items-center justify-center rounded-tl bg-background/85 text-foreground/70">
                  <MoonStarIcon className="h-3 w-3" title={sourceLabel ?? undefined} />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 px-2">
              <p className="text-[13px] font-medium truncate">{song.title}</p>
              <p className="text-[13px] text-foreground/65 truncate">{song.artist}</p>
            </div>

            <div className="w-16 max-w-16 min-w-16 p-1.5 text-[13px] text-foreground/70 shrink-0 text-right">
              {convertSecondsToTime(song.duration ?? 0)}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              navigate(ROUTES.ALBUM.PAGE(song.albumId, song.id))
              closeDrawer()
            }}
          >
            <MusicIcon className="mr-2 h-4 w-4" />
            <span>Zum Song</span>
          </ContextMenuItem>
          <ContextMenuItem
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              navigate(ROUTES.ARTIST.PAGE(song.artistId))
              closeDrawer()
            }}
          >
            <Mic2Icon className="mr-2 h-4 w-4" />
            <span>Zum Artist</span>
          </ContextMenuItem>
          <ContextMenuItem
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              navigate(ROUTES.ALBUM.PAGE(song.albumId))
              closeDrawer()
            }}
          >
            <Disc3Icon className="mr-2 h-4 w-4" />
            <span>Zum Album</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              removeSongFromQueue(song.id)
            }}
          >
            <XIcon className="mr-2 h-4 w-4" />
            <span>Aus Queue entfernen</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  return (
    <div
      className={clsx(
        'group/tablerow relative w-full flex flex-row items-center rounded-md h-14 transition-colors select-none',
        isDragging && !isOverlay
          ? 'opacity-20 bg-foreground/5'
          : 'hover:bg-foreground/20',
        isOverlay &&
          'shadow-xl border border-foreground/20 bg-popover cursor-grabbing',
        isActive &&
          !isDragging &&
          'row-active bg-foreground/20',
      )}
    >
      <div className="w-8 shrink-0 ml-1 relative flex items-center justify-center">
        {!isOverlay && song.queueSource === 'dj' && (
          <SparklesIcon
            className="absolute w-3.5 h-3.5 text-foreground/60 transition-opacity group-hover/tablerow:opacity-0"
            title={sourceLabel ?? undefined}
          />
        )}
        {!isOverlay && song.queueSource === 'session' && (
          <MoonStarIcon
            className="absolute w-3.5 h-3.5 text-foreground/60 transition-opacity group-hover/tablerow:opacity-0"
            title={sourceLabel ?? undefined}
          />
        )}
        {sortingEnabled && (
          <div
            {...(isOverlay ? {} : { ...dragAttributes, ...dragListeners })}
            className={clsx(
              'absolute flex items-center justify-center text-foreground/40 hover:text-foreground/70',
              isOverlay
                ? 'cursor-grabbing'
                : 'cursor-grab active:cursor-grabbing opacity-0 group-hover/tablerow:opacity-100 transition-opacity',
            )}
          >
            <GripVerticalIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="w-9 min-w-9 flex items-center p-1">
        <PlaySongButton
          trackNumber={songIndex + 1}
          trackId={song.id}
          handlePlayButton={() => setSongList(songs, songIndex)}
        />
      </div>

      <div className="flex-1 min-w-0 p-2 flex items-center gap-1.5">
        <TableSongTitle song={song} />
      </div>

      <div className="hidden xl:flex w-[22%] min-w-[14%] max-w-[24%] p-2 overflow-hidden">
        <Link
          to={ROUTES.ALBUM.PAGE(song.albumId)}
          className="hover:underline truncate text-foreground/70 hover:text-foreground text-sm"
          onClick={closeDrawer}
          onContextMenu={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          tabIndex={-1}
        >
          {song.album}
        </Link>
      </div>

      <div className="w-16 max-w-16 min-w-16 p-1.5 text-sm text-foreground/70 shrink-0 text-right">
        {convertSecondsToTime(song.duration ?? 0)}
      </div>

      <div className="w-[52px] max-w-[52px] min-w-[52px] p-1.5 flex items-center justify-center">
        <QueueActions row={{ original: song } as never} />
      </div>
    </div>
  )
}

const QueueRowContent = memo(QueueRowContentBase)

interface QueueRowProps {
  song: ISong
  songIndex: number
  virtualStart: number
  virtualSize: number
  songs: ISong[]
  currentSongId?: string
  compact?: boolean
}

function QueueRowBase({
  song,
  songIndex,
  virtualStart,
  virtualSize,
  songs,
  currentSongId,
  compact = false,
}: QueueRowProps) {
  const style: CSSProperties = {
    position: 'absolute',
    top: virtualStart,
    height: virtualSize,
    width: 'calc(100% - 12px)',
  }

  return (
    <div style={style}>
      <QueueRowContent
        song={song}
        songIndex={songIndex}
        songs={songs}
        currentSongId={currentSongId}
        sortingEnabled={false}
        isDragging={false}
        compact={compact}
      />
    </div>
  )
}

const QueueRow = memo(QueueRowBase)

interface SortableQueueRowProps extends QueueRowProps {
  isOverlay?: boolean
}

function SortableQueueRowBase({
  song,
  songIndex,
  virtualStart,
  virtualSize,
  songs,
  currentSongId,
  isOverlay = false,
  compact = false,
}: SortableQueueRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, disabled: isOverlay })

  const style: CSSProperties = isOverlay
    ? { height: virtualSize, width: 'calc(100% - 12px)' }
    : {
        position: 'absolute',
        top: virtualStart,
        height: virtualSize,
        width: 'calc(100% - 12px)',
        transform: CSS.Transform.toString(transform),
        transition,
      }

  return (
    <div ref={isOverlay ? undefined : setNodeRef} style={style}>
      <QueueRowContent
        song={song}
        songIndex={songIndex}
        songs={songs}
        currentSongId={currentSongId}
        sortingEnabled={true}
        isDragging={isDragging}
        isOverlay={isOverlay}
        compact={compact}
        dragAttributes={attributes as Record<string, unknown>}
        dragListeners={listeners as Record<string, unknown>}
      />
    </div>
  )
}

const SortableQueueRow = memo(SortableQueueRowBase)

interface SortableQueueListProps {
  songs: ISong[]
  currentSongIndex: number
  scrollToIndex?: boolean
  enableReorder?: boolean
  compact?: boolean
}

export function SortableQueueList({
  songs,
  currentSongIndex,
  scrollToIndex = false,
  enableReorder = true,
  compact = false,
}: SortableQueueListProps) {
  const { reorderQueue } = usePlayerActions()
  const currentSongId = usePlayerStore((state) => state.songlist.currentSong.id)
  const [activeId, setActiveId] = useState<string | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const getScrollElement = useCallback(() => {
    if (!parentRef.current) return null
    return parentRef.current.querySelector(scrollAreaViewportSelector)
  }, [])

  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement,
    estimateSize: () => 56,
    overscan: 5,
  })

  useEffect(() => {
    if (!scrollToIndex || currentSongIndex < 0) return
    virtualizer.scrollToIndex(currentSongIndex, { align: 'start' })
  }, [currentSongIndex, scrollToIndex, virtualizer])

  const sortableIds = useMemo(() => songs.map((s) => s.id), [songs])
  const activeSong = activeId ? songs.find((s) => s.id === activeId) : null
  const activeIndex = activeSong ? songs.indexOf(activeSong) : -1

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const fromIndex = songs.findIndex((s) => s.id === active.id)
    const toIndex = songs.findIndex((s) => s.id === over.id)

    if (fromIndex !== -1 && toIndex !== -1) {
      reorderQueue(fromIndex, toIndex)
    }
  }

  if (!enableReorder) {
    return (
      <ScrollArea
        ref={parentRef}
        type="always"
        className="h-full pr-1 [&_div:last-child]:border-0"
        thumbClassName="secondary-thumb-bar"
      >
        <div
          className="w-full relative"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const song = songs[virtualRow.index]
            return (
              <QueueRow
                key={song.id}
                song={song}
                songIndex={virtualRow.index}
                virtualStart={virtualRow.start}
                virtualSize={virtualRow.size}
                songs={songs}
                currentSongId={currentSongId}
                compact={compact}
              />
            )
          })}
        </div>
      </ScrollArea>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <ScrollArea
          ref={parentRef}
          type="always"
          className="h-full pr-1 [&_div:last-child]:border-0"
          thumbClassName="secondary-thumb-bar"
        >
          <div
            className="w-full relative"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const song = songs[virtualRow.index]
              return (
                <SortableQueueRow
                  key={song.id}
                  song={song}
                  songIndex={virtualRow.index}
                  virtualStart={virtualRow.start}
                  virtualSize={virtualRow.size}
                  songs={songs}
                  currentSongId={currentSongId}
                  compact={compact}
                />
              )
            })}
          </div>
        </ScrollArea>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeSong ? (
          <SortableQueueRow
            song={activeSong}
            songIndex={activeIndex}
            virtualStart={0}
            virtualSize={56}
            songs={songs}
            currentSongId={currentSongId}
            compact={compact}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
