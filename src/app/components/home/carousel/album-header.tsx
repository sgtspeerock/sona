import { Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { OnRepeatItem } from '@/app/components/home/carousel/on-repeat-item'
import { ImageLoader } from '@/app/components/image-loader'
import { Button } from '@/app/components/ui/button'
import { useOnRepeat } from '@/app/hooks/use-on-repeat'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import { Albums } from '@/types/responses/album'

interface AlbumHeaderProps {
  albums: Albums[]
  newReleaseAlbumId?: string
  title?: string
  subtitle?: string
  compact?: boolean
}

function AlbumHeaderItem({
  album,
  isNewRelease,
  compact = false,
}: {
  album: Albums
  isNewRelease?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()
  const { setSongList } = usePlayerActions()
  const [imageLoaded, setImageLoaded] = useState(false)

  async function handlePlayAlbum() {
    const response = await subsonic.albums.getOne(album.id)
    if (response) {
      setSongList(response.song, 0)
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ImageLoader
        id={album.artistId || album.coverArt}
        type={album.artistId ? 'artist' : 'album'}
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

      <div className="relative z-10 grid h-full grid-cols-[auto,minmax(0,1fr)] items-center gap-7 py-5 pl-8 pr-20 min-[1700px]:gap-8 min-[1700px]:pl-9 min-[2600px]:gap-10">
        <div className="flex flex-col items-center justify-center gap-2.5">
          <Link
            to={ROUTES.ALBUM.PAGE(album.id)}
            className="group relative block"
          >
            <ImageLoader id={album.coverArt} type="album">
              {(src) => (
                <img
                  src={src}
                  alt={album.name}
                  className={cn(
                    compact
                      ? 'aspect-square h-[178px] w-[178px] rounded-xl border object-cover shadow-none transition-all duration-300 group-hover:scale-[1.015] min-[1700px]:h-[188px] min-[1700px]:w-[188px]'
                      : 'aspect-square h-[210px] w-[210px] rounded-xl border object-cover shadow-none transition-all duration-300 group-hover:scale-[1.015] min-[1700px]:h-[230px] min-[1700px]:w-[230px] min-[2600px]:h-[250px] min-[2600px]:w-[250px]',
                    isNewRelease ? 'border-primary/55' : 'border-border/55',
                    imageLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  onLoad={() => setImageLoaded(true)}
                />
              )}
            </ImageLoader>
          </Link>

          {!compact && (
          <div className="w-[210px] min-[1700px]:w-[230px] min-[2600px]:w-[250px]">
            <div
              className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-md border px-2.5 py-1.5 text-center text-xs font-medium text-foreground/[0.82]',
                isNewRelease
                  ? 'border-primary/45 bg-primary/12'
                  : 'border-border/45 bg-background',
              )}
            >
              {album.genre && <span className="truncate">{album.genre}</span>}
              {album.genre && album.year && (
                <span className="text-foreground/40">&bull;</span>
              )}
              {album.year && <span>{album.year}</span>}
            </div>
          </div>
          )}
        </div>

        <div className="min-w-0 max-w-[560px] space-y-3 text-left">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center rounded-md border border-primary/35 bg-primary/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-primary">
                {t(
                  isNewRelease
                    ? 'home.newReleaseAlbum'
                    : 'home.recommendedAlbum',
                )}
              </p>
            </div>
            <Link
              to={ROUTES.ALBUM.PAGE(album.id)}
              className="mt-4 block hover:underline"
            >
              <h2 className="line-clamp-2 break-words text-[1.98rem] font-bold leading-[1.01] tracking-[-0.045em] min-[1700px]:text-[2.2rem] min-[2600px]:text-[2.4rem]">
                {album.name}
              </h2>
            </Link>
            <Link
              to={ROUTES.ARTIST.PAGE(album.artistId || '')}
              className="mt-1.5 inline-block text-base text-muted-foreground hover:text-primary hover:underline min-[1700px]:text-[1.05rem]"
            >
              {album.artist}
            </Link>
            {compact && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground/90">
                {album.year && <span>{album.year}</span>}
                {album.year && album.genre && <span>&bull;</span>}
                {album.genre && <span>{album.genre}</span>}
              </div>
            )}
          </div>

          <Button
            onClick={handlePlayAlbum}
            className="mt-1 h-8 w-fit gap-2 border border-primary/30 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
            size="sm"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            {t('options.play')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AlbumHeader({
  albums,
  newReleaseAlbumId,
  title,
  subtitle,
  compact = false,
}: AlbumHeaderProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [manualResetToken, setManualResetToken] = useState(0)
  const { data: onRepeat, isLoading: onRepeatLoading } = useOnRepeat()

  const carouselItems = useMemo(() => {
    const items: Array<
      | { type: 'onRepeat'; data: NonNullable<typeof onRepeat> }
      | { type: 'album'; data: Albums; isNewRelease: boolean }
    > = []

    if (onRepeat?.song) {
      items.push({
        type: 'onRepeat',
        data: onRepeat,
      })
    }

    const maxAlbums = compact ? (onRepeat?.song ? 3 : 4) : onRepeat?.song ? 5 : 6
    const limitedAlbums = albums.slice(0, maxAlbums)
    limitedAlbums.forEach((album) => {
      items.push({
        type: 'album',
        data: album,
        isNewRelease: album.id === newReleaseAlbumId,
      })
    })

    return items
  }, [albums, newReleaseAlbumId, onRepeat])

  useEffect(() => {
    if (carouselItems.length <= 1) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length)
    }, 9000)
    return () => {
      clearInterval(timer)
    }
  }, [carouselItems.length, manualResetToken])

  if (carouselItems.length === 0 && !onRepeatLoading) return null

  return (
    <div className="h-full">
      {title && (
        <div className="mb-4">
          <h2 className="text-3xl font-bold">{title}</h2>
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      )}

      <div className="sona-shell relative h-full overflow-hidden bg-background-foreground">
        <div className="relative h-full w-full overflow-hidden">
          {carouselItems.map((item, index) => {
            const isActive = currentSlide === index
            return (
              <div
                key={item.type === 'onRepeat' ? 'on-repeat' : item.data.id}
                className={cn(
                  'absolute inset-0 transition-opacity duration-700 ease-in-out',
                  isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                {item.type === 'onRepeat' ? (
                  <OnRepeatItem
                    song={item.data.song}
                    playcount={item.data.playcount}
                    compact={compact}
                  />
                ) : (
                  <AlbumHeaderItem
                    album={item.data}
                    isNewRelease={item.isNewRelease}
                    compact={compact}
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="absolute bottom-4 right-5 z-20 flex items-center gap-2">
          {carouselItems.map((item, index) => (
            <button
              key={`hero-dot-${item.type === 'onRepeat' ? 'on-repeat' : item.data.id}`}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => {
                setCurrentSlide(index)
                setManualResetToken((prev) => prev + 1)
              }}
              className={cn(
                'h-2 rounded-full transition-[width,background-color,opacity] duration-200',
                currentSlide === index
                  ? 'w-6 bg-primary opacity-100'
                  : 'w-2 bg-foreground/45 opacity-70 hover:bg-foreground/70 hover:opacity-100',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
