import { useQueryClient } from '@tanstack/react-query'
import { Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { Button } from '@/app/components/ui/button'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import type { Albums } from '@/types/responses/album'
import { queryKeys } from '@/utils/queryKeys'

export function RecentAddedColumn({ albums }: { albums: Albums[] }) {
  const queryClient = useQueryClient()
  const { setSongList } = usePlayerActions()
  const displayAlbums = albums.slice(0, 4)

  const playAlbum = async (album: Albums) => {
    const response = await queryClient.ensureQueryData({
      queryKey: [queryKeys.album.single, album.id],
      queryFn: async () => {
        const data = await subsonic.albums.getOne(album.id)
        if (!data) throw new Error('Album not found')
        return data
      },
    })

    if (response?.song?.length) setSongList(response.song, 0)
  }

  return (
    <section className="sona-panel flex h-full flex-col p-4">
      <div className="mb-3">
        <div className="flex flex-col items-start gap-1.5">
          <h2 className="text-base font-semibold tracking-[-0.01em]">
            Kürzlich hinzugefügt
          </h2>
          <Link
            to={ROUTES.ALBUMS.RECENTLY_ADDED}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
          >
            Mehr anzeigen
          </Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-start gap-2">
        {displayAlbums.map((album) => (
          <div
            key={album.id}
            className="group grid grid-cols-[56px,minmax(0,1fr),auto] items-center gap-3 rounded-lg bg-background p-2.5 transition-colors hover:bg-muted"
          >
            <Link
              to={ROUTES.ALBUM.PAGE(album.id)}
              className="h-14 w-14 overflow-hidden rounded-md border border-border/35 bg-muted"
            >
              <ImageLoader id={album.coverArt} type="album" size="160">
                {(src) =>
                  src ? (
                    <img
                      src={src}
                      alt={album.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null
                }
              </ImageLoader>
            </Link>
            <div className="min-w-0">
              <Link
                to={ROUTES.ALBUM.PAGE(album.id)}
                className="block truncate text-sm font-semibold hover:text-primary"
              >
                {album.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {album.artist}
                {album.year ? ` · ${album.year}` : ''}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-primary hover:text-primary-foreground group-hover:opacity-100"
              onClick={() => playAlbum(album)}
            >
              <Play className="h-4 w-4" fill="currentColor" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
