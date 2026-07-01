import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import { ListMusic } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { PlaylistOptions } from '@/app/components/playlist/options'
import { ContextMenuProvider } from '@/app/components/table/context-menu'
import { MainSidebarMenuButton } from '@/app/components/ui/main-sidebar'
import { useRouteIsActive } from '@/app/hooks/use-route-is-active'
import { ROUTES } from '@/routes/routesList'
import { Playlist } from '@/types/responses/playlist'

const MemoContextMenuProvider = memo(ContextMenuProvider)
const MemoPlaylistOptions = memo(PlaylistOptions)

export function SidebarPlaylistItem({ playlist }: { playlist: Playlist }) {
  const { isOnPlaylist } = useRouteIsActive()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playlist.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  }

  // Replicate MainSidebarMenuItem's element exactly, but with a real ref
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className="group/menu-item relative cursor-grab active:cursor-grabbing"
    >
      <MemoContextMenuProvider
        options={
          <MemoPlaylistOptions
            variant="context"
            playlist={playlist}
            showPlay={true}
          />
        }
      >
        <MainSidebarMenuButton
          asChild
          isActive={isOnPlaylist(playlist.id)}
          tooltip={playlist.name}
          className={clsx(isOnPlaylist(playlist.id) && 'cursor-default')}
        >
          <Link
            to={ROUTES.PLAYLIST.PAGE(playlist.id)}
            onClick={(e) => {
              if (isOnPlaylist(playlist.id)) {
                e.preventDefault()
              }
            }}
          >
            <ListMusic />
            <span className="truncate">{playlist.name}</span>
          </Link>
        </MainSidebarMenuButton>
      </MemoContextMenuProvider>
    </li>
  )
}
