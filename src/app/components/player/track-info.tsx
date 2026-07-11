import { AudioLines, Maximize2 } from 'lucide-react'
import { useCallback } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { useTranslation } from 'react-i18next'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { Link } from 'react-router-dom'
import { MarqueeTitle } from '@/app/components/fullscreen/marquee-title'
import { ImageLoader } from '@/app/components/image-loader'
import { SongMenuOptions } from '@/app/components/song/menu-options'
import { ContextMenuProvider } from '@/app/components/table/context-menu'
import { SimpleTooltip } from '@/app/components/ui/simple-tooltip'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routesList'
import { useMainDrawerState, useSongColor } from '@/store/player.store'
import { useFullscreenState } from '@/store/ui.store'
import { ISong } from '@/types/responses/song'
import { getAverageColor } from '@/utils/getAverageColor'
import { logger } from '@/utils/logger'
import { ALBUM_ARTISTS_MAX_NUMBER } from '@/utils/multipleArtists'

const getRandomHexColor = () =>
  `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0')}`

export function TrackInfo({ song }: { song: ISong | undefined }) {
  const { t } = useTranslation()
  const { setCurrentSongColor, currentSongColor } = useSongColor()
  const { mainDrawerState, closeDrawer } = useMainDrawerState()
  const { setOpen: setFullscreenOpen } = useFullscreenState()

  const handleNavigate = () => {
    if (mainDrawerState) closeDrawer()
  }

  const getImageElement = useCallback(() => {
    return document.getElementById('track-song-image') as HTMLImageElement
  }, [])

  const getImageColor = useCallback(async () => {
    const img = getImageElement()
    if (!img) return

    let color = getRandomHexColor()

    try {
      color = (await getAverageColor(img)).hex
    } catch {
      logger.error('[TrackInfo] - Unable to get image average color.')
    }

    if (color !== currentSongColor) {
      setCurrentSongColor(color)
    }
  }, [currentSongColor, setCurrentSongColor, getImageElement])

  function handleError() {
    const img = getImageElement()
    if (!img) return

    img.crossOrigin = null
  }

  if (!song) {
    return (
      <Fragment>
        <div className="w-[70px] h-[70px] flex justify-center items-center bg-muted rounded-lg">
          <AudioLines data-testid="song-no-playing-icon" />
        </div>
        <div className="flex flex-col justify-center">
          <span
            className="text-sm font-medium"
            data-testid="song-no-playing-label"
          >
            {t('player.noSongPlaying')}
          </span>
        </div>
      </Fragment>
    )
  }

  return (
    <ContextMenuProvider
      options={<SongMenuOptions variant="context" song={song} index={0} />}
    >
      <div className="flex items-center gap-2 w-full">
        <SimpleTooltip text={t('fullscreen.switchButton')}>
          <div
            className="group relative w-[70px] h-[70px] cursor-pointer transition-transform hover:scale-105"
            data-coach-id="fullscreen-cover"
            onClick={() => setFullscreenOpen(true)}
          >
            {currentSongColor && (
              <div
                className="absolute inset-1.5 -z-10 rounded-lg blur-[10px] opacity-75 transition-all duration-500 scale-95 group-hover:scale-105 group-hover:blur-[12px] group-hover:opacity-90"
                style={{
                  backgroundColor: currentSongColor,
                  boxShadow: `0 8px 16px ${currentSongColor}66`,
                }}
              />
            )}
            <div className="w-full h-full aspect-square bg-cover bg-center bg-skeleton rounded-lg overflow-hidden shadow-md relative z-10">
              <ImageLoader id={song.coverArt} type="song" size={400}>
                {(src) => (
                  <LazyLoadImage
                    key={song.id}
                    id="track-song-image"
                    src={src}
                    width="100%"
                    height="100%"
                    crossOrigin="anonymous"
                    effect="opacity"
                    className="aspect-square object-cover w-full h-full bg-skeleton text-transparent"
                    data-testid="track-image"
                    alt={`${song.artist} - ${song.title}`}
                    onLoad={getImageColor}
                    onError={handleError}
                  />
                )}
              </ImageLoader>
            </div>
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/0 transition-opacity duration-150 group-hover:bg-black/35">
              <Maximize2 className="h-4 w-4 text-white/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            </div>
          </div>
        </SimpleTooltip>
        <div className="flex flex-col justify-center w-full overflow-hidden">
          <MarqueeTitle gap="mr-2">
            <Link
              to={ROUTES.ALBUM.PAGE(song.albumId)}
              tabIndex={-1}
              onClick={handleNavigate}
            >
              <span
                className="text-[15px] font-semibold hover:underline cursor-pointer"
                data-testid="track-title"
              >
                {song.title}
              </span>
            </Link>
          </MarqueeTitle>
          <TrackInfoArtistsLinks song={song} onNavigate={handleNavigate} />
        </div>
      </div>
    </ContextMenuProvider>
  )
}

type TrackInfoArtistsLinksProps = {
  song: ISong
  onNavigate: () => void
}

function TrackInfoArtistsLinks({
  song,
  onNavigate,
}: TrackInfoArtistsLinksProps) {
  const { artists, artistId, artist } = song

  if (artists && artists.length > 1) {
    const reducedArtists = artists.slice(0, ALBUM_ARTISTS_MAX_NUMBER)

    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground w-full maskImage-marquee-fade-finished">
        {reducedArtists.map(({ id, name }, index) => (
          <div key={id} className="flex items-center">
            <ArtistLink id={id} name={name} onClick={onNavigate} />
            {index < reducedArtists.length - 1 && ','}
          </div>
        ))}
      </div>
    )
  }

  return <ArtistLink id={artistId} name={artist} onClick={onNavigate} />
}

type ArtistLinkProps = {
  id?: string
  name: string
  onClick?: () => void
}

function ArtistLink({ id, name, onClick }: ArtistLinkProps) {
  return (
    <Link
      to={ROUTES.ARTIST.PAGE(id ?? '')}
      className={cn('w-fit inline-flex', !id && 'pointer-events-none')}
      data-testid="track-artist-url"
      onClick={onClick}
    >
      <span
        className={cn(
          'text-xs text-muted-foreground text-nowrap',
          id && 'hover:underline hover:text-foreground',
        )}
      >
        {name}
      </span>
    </Link>
  )
}
