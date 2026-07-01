import { Info, Music, Play, RefreshCw } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { SecondaryTileFrame } from '@/app/components/home/secondary-tile'
import { Button } from '@/app/components/ui/button'
import { useThisIsArtist } from '@/app/hooks/use-this-is-artist'
import { ROUTES } from '@/routes/routesList'
import { usePlayerActions } from '@/store/player.store'
import { navigateSafe } from '@/utils/navigateSafe'

export function ThisIsArtist() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { playlist, artist, isGenerating, error, generate, isConfigured } =
    useThisIsArtist()
  const { setSongList } = usePlayerActions()

  if (!isConfigured) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-dashed border-border/70 bg-card/30">
        <div className="relative z-10 flex h-full items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <Info className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <h3 className="mb-1 text-sm font-semibold">
              {t('home.thisIsArtist')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('home.configureLastfm')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-destructive/60 bg-destructive/5">
        <div className="relative z-10 flex h-full items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <p className="text-xs text-destructive">
              {t('states.error.title')}
            </p>
            <p className="mt-1 line-clamp-2 text-[11px] text-destructive/85">
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-border/60 bg-card/25">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent" />
        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {t('home.generating')}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (playlist.length === 0 || !artist) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-border/60 bg-card/25">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent" />
        <div className="relative z-10 flex h-full items-center justify-center p-8">
          <div className="text-center">
            <Music className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-2 text-sm">
              {t('home.thisIsArtist')}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('home.generatePlaylist')}
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={generate}
              disabled={isGenerating}
              className="h-8 border border-primary/35 bg-primary/90 px-3 hover:bg-primary"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              {t('home.generate')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handlePlay = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setSongList(playlist, 0)
  }

  return (
    <div
      className="group block h-full w-full cursor-pointer text-left"
      onClick={() => navigateSafe(navigate, ROUTES.LIBRARY.THIS_IS_ARTIST)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigateSafe(navigate, ROUTES.LIBRARY.THIS_IS_ARTIST)
        }
      }}
      role="link"
      tabIndex={0}
    >
      <SecondaryTileFrame
        coverArt={artist.coverArt}
        imageType="artist"
        imageSize="800"
        imagePosition="center 28%"
      >
        <div>
          <div className="sona-pill mb-3">
            <Music className="h-3.5 w-3.5 text-primary" />
            <span>{t('home.thisIsPrefix')}</span>
          </div>
          <h2 className="line-clamp-2 break-words text-[1.06rem] font-semibold leading-[1.12] tracking-[-0.018em] sm:text-[1.14rem]">
            {artist.name}
          </h2>
          <p className="mt-1 text-xs font-medium text-muted-foreground/90">
            {t('playlist.songCount', { count: playlist.length })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlay}
            className="sona-card-action"
            size="sm"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            {t('options.play')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation()
              generate()
            }}
            disabled={isGenerating}
            className="h-7 w-7 rounded-full border border-foreground/[0.13] bg-foreground/[0.10] text-foreground/75 hover:bg-foreground/[0.16] hover:text-foreground"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </SecondaryTileFrame>
    </div>
  )
}
