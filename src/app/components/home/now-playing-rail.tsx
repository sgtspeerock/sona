import { ListMusic } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { ROUTES } from '@/routes/routesList'
import {
  usePlayerDuration,
  usePlayerProgress,
  usePlayerSonglist,
} from '@/store/player.store'
import { convertSecondsToTime } from '@/utils/convertSecondsToTime'

export function NowPlayingRail() {
  const { currentList, currentSong, currentSongIndex } = usePlayerSonglist()
  const progress = usePlayerProgress()
  const duration = usePlayerDuration()
  const queue = currentList.slice(currentSongIndex)
  const hasSong = Boolean(currentSong?.id)
  const progressPercent =
    duration && duration > 0 ? Math.min(100, (progress / duration) * 100) : 0

  return (
    <aside className="sona-panel sticky top-4 flex h-[calc(100vh-var(--header-height)-var(--player-height)-2rem)] min-h-[620px] flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Now Playing</p>
          <p className="text-xs text-muted-foreground">Aktuelle Session</p>
        </div>
        <ListMusic className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="rounded-xl border border-border/35 bg-background p-3">
        <div className="aspect-square overflow-hidden rounded-lg border border-border/35 bg-muted">
          {hasSong && currentSong.coverArt ? (
            <ImageLoader id={currentSong.coverArt} type="album" size="520">
              {(src) =>
                src ? (
                  <img
                    src={src}
                    alt={currentSong.title}
                    className="h-full w-full object-cover"
                  />
                ) : null
              }
            </ImageLoader>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/12 to-background">
              <ListMusic className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="mt-3 min-w-0">
          {hasSong ? (
            <>
              <Link
                to={ROUTES.ALBUM.PAGE(currentSong.albumId)}
                className="block truncate text-base font-semibold leading-tight hover:text-primary"
              >
                {currentSong.title}
              </Link>
              <Link
                to={ROUTES.ARTIST.PAGE(currentSong.artistId)}
                className="mt-0.5 block truncate text-sm text-muted-foreground hover:text-primary"
              >
                {currentSong.artist}
              </Link>
            </>
          ) : (
            <>
              <p className="text-base font-semibold">Nichts läuft gerade</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Starte einen Mix oder ein Album.
              </p>
            </>
          )}
        </div>

        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span>{convertSecondsToTime(progress || 0)}</span>
            <span>
              {convertSecondsToTime(duration || currentSong.duration || 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Queue</p>
          <span className="text-xs text-muted-foreground">
            {currentList.length} Songs
          </span>
        </div>

        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="space-y-1.5">
            {queue.length > 0 ? (
              queue.slice(0, 40).map((song, index) => {
                const isActive = index === 0
                return (
                  <div
                    key={`${song.id}-${index}`}
                    className={[
                      'grid grid-cols-[36px,minmax(0,1fr),auto] items-center gap-2 rounded-lg px-2 py-1.5',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted',
                    ].join(' ')}
                  >
                    <div className="h-9 w-9 overflow-hidden rounded-md bg-muted">
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
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {song.title}
                      </p>
                      <p
                        className={[
                          'truncate text-[11px]',
                          isActive
                            ? 'text-primary-foreground/75'
                            : 'text-muted-foreground',
                        ].join(' ')}
                      >
                        {song.artist}
                      </p>
                    </div>
                    <span
                      className={[
                        'text-[11px]',
                        isActive
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground',
                      ].join(' ')}
                    >
                      {convertSecondsToTime(song.duration ?? 0)}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="rounded-lg border border-dashed border-border/45 p-4 text-sm text-muted-foreground">
                Deine Queue erscheint hier, sobald Musik läuft.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  )
}
