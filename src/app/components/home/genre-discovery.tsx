import { Activity, CalendarClock, Play, Radio, Zap } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { startTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { SecondaryTileFrame } from '@/app/components/home/secondary-tile'
import { PanelBackground } from '@/app/components/home/panel-background'
import { ImageLoader } from '@/app/components/image-loader'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  GenreDiscoveryItem,
  useGetAlbumsByGenre,
  useGetAnniversaryRadio,
  useGetGenreDiscovery,
  useGetSessionEnergy,
} from '@/app/hooks/use-home'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'

export interface GenreCardProps {
  genre: string
  albumCount?: number
  index?: number
  layout?: 'wide' | 'narrow'
}

export function GenreCard({ genre, albumCount, layout = 'narrow' }: GenreCardProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useGetAlbumsByGenre(genre, 16)
  const { setSongList } = usePlayerActions()

  if (!data?.list || data.list.length === 0) return null

  const randomSeed = genre
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const selectedAlbum = data.list[randomSeed % data.list.length]
  const playGenreRadio = async () => {
    const songs = await subsonic.songs.getRandomSongs({
      size: 35,
      genre,
    })

    if (!songs?.length) return

    startTransition(() => {
      setSongList(songs, 0, true)
    })
  }

  if (layout === 'wide') {
    return (
      <button
        type="button"
        className="group relative h-full w-full overflow-hidden text-left sona-panel bg-background-foreground p-5 transition-colors hover:border-primary/35"
        onClick={playGenreRadio}
      >
        <PanelBackground coverArt={selectedAlbum?.coverArt} />
        <div className="relative z-[1] flex h-full flex-col justify-between">
          <div>
            <div className="sona-pill mb-3">
              <Radio className="h-3.5 w-3.5 text-primary" />
              <span>{t('home.genreRadio.label', 'Genre radio')}</span>
            </div>
            <h3 className="truncate text-xl font-bold leading-tight tracking-[-0.035em]">
              {genre}
            </h3>
            <p className="mt-1.5 truncate text-xs font-medium leading-snug text-muted-foreground/[0.92]">
              {t('genres.albumCount', {
                count: albumCount ?? data.list.length,
              })}
            </p>
            {isLoading && <Skeleton className="mt-2 h-3 w-24" />}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-primary/35 bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              {t('home.genreRadio.play', 'Start radio')}
            </span>
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      className="group block h-full w-full text-left"
      onClick={playGenreRadio}
    >
      <SecondaryTileFrame coverArt={selectedAlbum?.coverArt}>
        <div>
          <div className="sona-pill mb-3">
            <Radio className="h-3.5 w-3.5 text-primary" />
            <span>{t('home.genreRadio.label', 'Genre radio')}</span>
          </div>
          <h3 className="line-clamp-2 text-[1.06rem] font-semibold leading-[1.12] tracking-[-0.018em] sm:text-[1.14rem]">
            {genre}
          </h3>
          <p className="mt-1 text-xs font-medium text-muted-foreground/90">
            {t('genres.albumCount', {
              count: albumCount ?? data.list.length,
            })}
          </p>
          {isLoading && <Skeleton className="mt-1 h-3 w-16" />}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-primary/35 bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            {t('home.genreRadio.play', 'Start radio')}
          </span>
        </div>
      </SecondaryTileFrame>
    </button>
  )
}

interface GenreDiscoveryProps {
  genres?: GenreDiscoveryItem[]
  isLoading?: boolean
  thirdCard?: ReactNode
  includeAnniversary?: boolean
  maxGenres?: number
}

export function GenreDiscovery({
  genres = [],
  isLoading = false,
  thirdCard,
  includeAnniversary = true,
  maxGenres = 2,
}: GenreDiscoveryProps) {
  const anniversaryRadio = useGetAnniversaryRadio()

  if (isLoading || (includeAnniversary && anniversaryRadio.isLoading)) {
    return (
      <div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[...new Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[154px] rounded-xl sm:h-[166px]" />
          ))}
        </div>
      </div>
    )
  }

  const visibleGenres = genres.slice(0, maxGenres)
  const hasCards =
    visibleGenres.length > 0 || includeAnniversary || Boolean(thirdCard)
  const cardCount =
    visibleGenres.length + (includeAnniversary ? 1 : 0) + (thirdCard ? 1 : 0)

  if (!hasCards) return null

  return (
    <div className="min-w-0">
      <div
        className={
          cardCount === 4
            ? 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2'
            : cardCount <= 2
              ? 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2'
              : thirdCard
                ? 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 min-[1850px]:grid-cols-4'
                : 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3'
        }
      >
        {visibleGenres.map((genre, index) => (
          <GenreCard
            key={genre.value}
            genre={genre.value}
            albumCount={genre.albumCount}
            index={index}
          />
        ))}
        {includeAnniversary && (
          <AnniversaryRadioCard data={anniversaryRadio.data} />
        )}
        {thirdCard && <div className="min-w-0">{thirdCard}</div>}
      </div>
    </div>
  )
}

export function AnniversaryRadioCard({
  data,
  layout = 'narrow',
}: {
  data?: {
    album?: {
      id: string
      name: string
      artist: string
      coverArt: string
      year?: number
    }
    yearsAgo?: number
  }
  layout?: 'wide' | 'narrow'
}) {
  const { t } = useTranslation()
  const { setSongList } = usePlayerActions()
  const navigate = useNavigate()
  const album = data?.album
  const coverArt = album?.coverArt

  const playAnniversary = async (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation()

    if (!album) return

    const response = await subsonic.albums.getOne(album.id)
    if (!response?.song?.length) return

    startTransition(() => {
      setSongList(response.song, 0)
    })
  }

  const handleCardClick = () => {
    if (album) {
      startTransition(() => {
        navigate(ROUTES.ALBUM.PAGE(album.id))
      })
    }
  }

  if (layout === 'wide') {
    return (
      <div
        className="group relative h-full w-full overflow-hidden text-left sona-panel bg-background-foreground p-5 transition-colors hover:border-primary/35 cursor-pointer"
        onClick={handleCardClick}
        onKeyDown={(event) => {
          if (!album) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleCardClick()
          }
        }}
        role={album ? 'link' : undefined}
        tabIndex={album ? 0 : -1}
        aria-disabled={!album}
        data-disabled={!album}
      >
        <PanelBackground coverArt={coverArt} />
        <div className="relative z-[1] flex h-full flex-col justify-between">
          <div>
            <div className="sona-pill mb-3">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              <span>
                {album
                  ? t('home.anniversaryRadio.label', {
                      years: data?.yearsAgo,
                      count: data?.yearsAgo,
                    })
                  : t('home.anniversaryRadio.albumFallback')}
              </span>
            </div>
            <h3 className="truncate text-xl font-bold leading-tight tracking-[-0.035em]">
              {album?.name || t('home.anniversaryRadio.empty', 'No memory found')}
            </h3>
            {album ? (
              <p className="mt-1.5 truncate text-xs font-medium leading-snug text-muted-foreground/[0.92]">
                {album.artist}
              </p>
            ) : (
              <p className="mt-1.5 text-xs font-medium leading-snug text-muted-foreground/[0.92] line-clamp-2">
                {t('home.anniversaryRadio.emptyDescription')}
              </p>
            )}
          </div>

          {album && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 gap-1.5 border border-primary/35 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                onClick={playAnniversary}
              >
                <Play className="h-3.5 w-3.5" fill="currentColor" />
                {t('options.play')}
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="group block h-full w-full text-left"
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (!album) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleCardClick()
        }
      }}
      role={album ? 'link' : undefined}
      tabIndex={album ? 0 : -1}
      aria-disabled={!album}
      data-disabled={!album}
    >
      <SecondaryTileFrame coverArt={coverArt} disabled={!album}>
        <div>
          <div className="sona-pill mb-3">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            <span>
              {album
                ? t('home.anniversaryRadio.label', {
                    years: data?.yearsAgo,
                    count: data?.yearsAgo,
                  })
                : t('home.anniversaryRadio.albumFallback')}
            </span>
          </div>
          <h3 className="line-clamp-2 text-[1.06rem] font-semibold leading-[1.12] tracking-[-0.018em] sm:text-[1.14rem]">
            {album?.name || t('home.anniversaryRadio.empty', 'No memory found')}
          </h3>
          {album ? (
            <div className="mt-1 text-xs font-medium text-muted-foreground/90">
              <p className="truncate">{album.artist}</p>
            </div>
          ) : (
            <p className="mt-1 line-clamp-2 text-xs font-medium text-muted-foreground/90">
              {t('home.anniversaryRadio.emptyDescription')}
            </p>
          )}
        </div>

        {album && (
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              className="sona-card-action"
              onClick={playAnniversary}
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              {t('options.play')}
            </Button>
          </div>
        )}
      </SecondaryTileFrame>
    </div>
  )
}

export function ConnectedGenreDiscovery() {
  const { genres, isLoading } = useGetGenreDiscovery()
  return <GenreDiscovery genres={genres} isLoading={isLoading} />
}

export default GenreDiscovery

export function HistoryCard() {
  const anniversaryRadio = useGetAnniversaryRadio()

  if (anniversaryRadio.isLoading) {
    return <Skeleton className="h-full rounded-xl" />
  }

  return <AnniversaryRadioCard data={anniversaryRadio.data} />
}

export function SessionEnergyCard({ layout = 'wide' }: { layout?: 'wide' | 'narrow' }) {
  const { data, isLoading } = useGetSessionEnergy()
  const { t } = useTranslation()
  const { setSongList } = usePlayerActions()
  const songs = data?.songs ?? []
  const coverArt = songs.find((song) => song.coverArt)?.coverArt

  const playSessionEnergy = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (songs.length === 0) return
    startTransition(() => {
      setSongList(songs, 0, true)
    })
  }

  const subtitle = data?.genre
    ? t('home.sessionEnergy.descriptionWithGenre', { genre: data.genre })
    : t('home.sessionEnergy.description')

  if (layout === 'narrow') {
    return (
      <div className="h-full w-full text-left">
        <SecondaryTileFrame coverArt={coverArt} disabled={songs.length === 0}>
          <div>
            <div className="sona-pill mb-3">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>{t('home.sessionEnergy.label')}</span>
            </div>
            <h3 className="line-clamp-2 text-[1.06rem] font-semibold leading-[1.12] tracking-[-0.018em] sm:text-[1.14rem]">
              {t('home.sessionEnergy.title')}
            </h3>
            <p className="mt-1 text-xs font-medium text-muted-foreground/90 line-clamp-1">
              {subtitle}
            </p>
            {isLoading && <Skeleton className="mt-1 h-3 w-16" />}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              className="sona-card-action"
              disabled={songs.length === 0}
              onClick={playSessionEnergy}
            >
              <Zap className="h-3.5 w-3.5" fill="currentColor" />
              {t('home.sessionEnergy.play')}
            </Button>
          </div>
        </SecondaryTileFrame>
      </div>
    )
  }

  return (
    <div className="sona-panel group relative h-full overflow-hidden bg-background-foreground p-5 transition-colors hover:border-primary/35">
      {coverArt && (
        <ImageLoader id={coverArt} type="album" size="520">
          {(src) =>
            src ? (
              <>
                <div
                  className="absolute inset-0 scale-[1.13] bg-cover bg-center opacity-[0.34] blur-sm saturate-150"
                  style={{ backgroundImage: `url(${src})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background/82 via-background/62 to-background/34" />
                <div
                  className="absolute right-0 top-0 h-full w-[58%] scale-[1.1] bg-cover bg-center opacity-[0.68] saturate-125"
                  style={{
                    backgroundImage: `url(${src})`,
                    WebkitMaskImage:
                      'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0) 100%)',
                    maskImage:
                      'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0) 100%)',
                  }}
                />
                <div className="absolute inset-y-0 right-0 w-[62%] bg-gradient-to-l from-background/12 via-background/8 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_26%,hsl(var(--primary)/0.28),transparent_36%),radial-gradient(circle_at_18%_82%,hsl(var(--accent-foreground)/0.14),transparent_34%)] mix-blend-screen" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/48 to-transparent" />
              </>
            ) : null
          }
        </ImageLoader>
      )}

      <div className="relative z-[1] flex h-full flex-col justify-between">
        <div>
          <div className="sona-pill mb-3">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span>{t('home.sessionEnergy.label')}</span>
          </div>
          <h3 className="truncate text-xl font-bold leading-tight tracking-[-0.035em]">
            {t('home.sessionEnergy.title')}
          </h3>
          <p className="mt-1.5 truncate text-xs font-medium leading-snug text-muted-foreground/[0.92]">
            {subtitle}
          </p>
          {isLoading && <Skeleton className="mt-2 h-3 w-24" />}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 gap-1.5 border border-primary/35 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
            disabled={songs.length === 0}
            onClick={playSessionEnergy}
          >
            <Zap className="h-3.5 w-3.5" fill="currentColor" />
            {t('home.sessionEnergy.play')}
          </Button>
        </div>
      </div>
    </div>
  )
}
