import { Play, Repeat } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routesList'
import { usePlayerActions } from '@/store/player.store'
import type { Song } from '@/types/responses/song'

interface OnRepeatItemProps {
  song: Song
  playcount: number
  compact?: boolean
}

export function OnRepeatItem({
  song,
  playcount: _playcount,
  compact = false,
}: OnRepeatItemProps) {
  const { t } = useTranslation()
  const { setSongList } = usePlayerActions()
  const [imageLoaded, setImageLoaded] = useState(false)

  function handlePlaySong() {
    setSongList([song], 0)
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Background Image with Blur */}
      <ImageLoader
        id={song.artistId || song.coverArt}
        type={song.artistId ? 'artist' : 'album'}
        size="1200"
      >
        {(src) => (
          <>
            <div
              className="absolute inset-y-0 left-0 w-[62%] scale-[1.16] bg-cover opacity-[0.7] blur-3xl saturate-125"
              style={{
                backgroundImage: `url(${src})`,
                backgroundPosition: 'center 28%',
              }}
            />
            <div
              className="absolute right-0 top-0 h-full w-[80%] scale-[1.08] bg-cover opacity-100 saturate-125"
              style={{
                backgroundImage: `url(${src})`,
                backgroundPosition: 'center 28%',
                WebkitMaskImage:
                  'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 48%, rgba(0,0,0,0.24) 76%, rgba(0,0,0,0) 100%)',
                maskImage:
                  'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 48%, rgba(0,0,0,0.24) 76%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--background)/0.96)_0%,hsl(var(--background)/0.84)_35%,hsl(var(--background)/0.28)_72%,hsl(var(--background)/0.06)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,hsl(var(--primary)/0.34),transparent_34%),radial-gradient(circle_at_72%_88%,hsl(var(--accent-foreground)/0.18),transparent_36%)] opacity-85 mix-blend-screen" />
          </>
        )}
      </ImageLoader>

      {/* Content */}
      <div className="relative z-10 grid h-full grid-cols-[auto,minmax(0,1fr)] items-center gap-7 py-5 pl-8 pr-20 min-[1700px]:gap-8 min-[1700px]:pl-9 min-[2600px]:gap-10">
        <div className="flex flex-col items-center justify-center gap-2.5">
          <Link
            to={ROUTES.ALBUM.PAGE(song.albumId)}
            className="group relative block"
          >
            <ImageLoader id={song.coverArt} type="album">
              {(src) => (
                <img
                  src={src}
                  alt={song.title}
                  className={cn(
                    compact
                      ? 'aspect-square h-[178px] w-[178px] rounded-xl border border-border/55 object-cover shadow-none transition-all duration-300 group-hover:scale-[1.015] min-[1700px]:h-[188px] min-[1700px]:w-[188px]'
                      : 'aspect-square h-[210px] w-[210px] rounded-xl border border-border/55 object-cover shadow-2xl transition-all duration-300 group-hover:scale-[1.02] min-[1700px]:h-[230px] min-[1700px]:w-[230px] min-[2600px]:h-[250px] min-[2600px]:w-[250px]',
                    imageLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  onLoad={() => setImageLoaded(true)}
                />
              )}
            </ImageLoader>
          </Link>

          {!compact && (
            <div className="w-[210px] min-[1700px]:w-[230px] min-[2600px]:w-[250px]">
              <div className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border/45 bg-background px-2.5 py-1.5 text-center text-xs font-medium text-foreground/[0.82]">
                {song.genre && <span className="truncate">{song.genre}</span>}
                {song.genre && song.year && (
                  <span className="text-foreground/40">•</span>
                )}
                {song.year && <span>{song.year}</span>}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 max-w-[560px] space-y-3 text-left">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-primary/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-primary">
              <Repeat className="w-3.5 h-3.5" />
              <span>On Repeat</span>
            </div>
            <Link
              to={ROUTES.ALBUM.PAGE(song.albumId)}
              className="mt-4 block hover:underline"
            >
              <h2 className="line-clamp-2 break-words text-[1.98rem] font-bold leading-[1.01] tracking-[-0.045em] min-[1700px]:text-[2.2rem] min-[2600px]:text-[2.4rem]">
                {song.title}
              </h2>
            </Link>
            <Link
              to={ROUTES.ARTIST.PAGE(song.artistId)}
              className="mt-1.5 inline-block text-base text-muted-foreground hover:text-primary hover:underline min-[1700px]:text-[1.05rem]"
            >
              {song.artist}
            </Link>
            {compact && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground/90">
                {song.year && <span>{song.year}</span>}
                {song.year && song.genre && <span>&bull;</span>}
                {song.genre && <span>{song.genre}</span>}
              </div>
            )}
          </div>

          <Button
            onClick={handlePlaySong}
            className="mt-1 h-8 w-fit gap-2 border border-primary/30 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
            size="sm"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            {t('home.playNow')}
          </Button>
        </div>
      </div>
    </div>
  )
}
