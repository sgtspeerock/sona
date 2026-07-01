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
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import clsx from 'clsx'
import { ListMusic } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyPlaylistsMessage } from '@/app/components/playlist/empty-message'
import { SidebarPlaylistButtons } from '@/app/components/playlist/sidebar-buttons'
import {
  MainSidebarGroupLabel,
  MainSidebarMenu,
  MainSidebarMenuButton,
  MainSidebarMenuItem,
  useMainSidebar,
} from '@/app/components/ui/main-sidebar'
import { usePlaylistsQuery } from '@/app/hooks/use-playlists-query'
import { usePlaylistOrder } from '@/store/app.store'
import { Playlist } from '@/types/responses/playlist'
import { SidebarPlaylistItem } from './playlist-item'

/** Sort playlists by the saved ID order; unordered ones go to the end. */
function applySavedOrder(playlists: Playlist[], order: string[]): Playlist[] {
  if (order.length === 0) return playlists
  const indexMap = new Map(order.map((id, i) => [id, i]))
  return [...playlists].sort((a, b) => {
    const ia = indexMap.get(a.id) ?? Infinity
    const ib = indexMap.get(b.id) ?? Infinity
    return ia - ib
  })
}

export function NavPlaylists() {
  const { t } = useTranslation()
  const { state, isMobile } = useMainSidebar()
  const { playlistOrder, setPlaylistOrder } = usePlaylistOrder()
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null)
  const isCollapsed = state === 'collapsed' && !isMobile

  const { data: playlists } = usePlaylistsQuery()

  const sortedPlaylists = useMemo(
    () => (playlists ? applySavedOrder(playlists, playlistOrder) : []),
    [playlists, playlistOrder],
  )

  const hasPlaylists = sortedPlaylists.length > 0

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const found = sortedPlaylists.find((p) => p.id === event.active.id)
    setActivePlaylist(found ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActivePlaylist(null)
    if (!over || active.id === over.id) return

    const fromIndex = sortedPlaylists.findIndex((p) => p.id === active.id)
    const toIndex = sortedPlaylists.findIndex((p) => p.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const reordered = [...sortedPlaylists]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)

    setPlaylistOrder(reordered.map((p) => p.id))
  }

  if (isCollapsed) {
    return null
  }

  return (
    <div className="px-4 pb-4 pt-1">
      <div
        className={clsx(
          'mb-2 mt-3 flex items-center justify-between',
          'transition-opacity group-data-[collapsible=icon]:opacity-0',
          'group-data-[collapsible=icon]:pointer-events-none',
        )}
      >
        <div className="min-w-0 flex-1 px-0">
          <MainSidebarGroupLabel className="h-6 px-2.5 uppercase tracking-[0.1em] text-foreground/55">
            {t('sidebar.playlists')}
          </MainSidebarGroupLabel>
        </div>
        <SidebarPlaylistButtons />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedPlaylists.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <MainSidebarMenu>
            {hasPlaylists &&
              sortedPlaylists.map((playlist) => (
                <SidebarPlaylistItem key={playlist.id} playlist={playlist} />
              ))}

            {!hasPlaylists && <EmptyPlaylistsMessage />}
          </MainSidebarMenu>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activePlaylist ? (
            <MainSidebarMenuItem>
              <MainSidebarMenuButton className="pl-3 bg-accent/80 shadow-lg cursor-grabbing">
                <ListMusic className="w-4 h-4 shrink-0" />
                <span className="truncate">{activePlaylist.name}</span>
              </MainSidebarMenuButton>
            </MainSidebarMenuItem>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
