import { Calendar, Info, Play, Sparkles } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { Button } from '@/app/components/ui/button'
import { useDiscoverWeekly } from '@/app/hooks/use-discover-weekly'
import { ROUTES } from '@/routes/routesList'
import { usePlayerActions } from '@/store/player.store'
import { navigateSafe } from '@/utils/navigateSafe'

export function DiscoverWeeklyCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { playlist, isGenerating, error, isConfigured } = useDiscoverWeekly()
  const { setSongList } = usePlayerActions()

  if (!isConfigured) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-dashed border-border/70 bg-card/30">
        <div className="relative z-10 flex h-full items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <Info className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <h3 className="mb-1 text-sm font-semibold">
              {t('home.discoverWeekly')}
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
            <p className="mt-1 text-[11px] text-destructive/85 line-clamp-2">
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
            <Calendar className="h-6 w-6 animate-pulse text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {t('home.generating')}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (!playlist || playlist.length === 0) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-border/60 bg-card/25">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent" />
        <div className="relative z-10 flex h-full items-center justify-center p-8">
          <div className="text-center">
            <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-2 text-sm">
              {t('home.discoverWeekly')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('home.weeklyMixSoon')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handlePlay = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setSongList(playlist, 0)
  }

  // Get cover art from first song
  const coverArt = playlist[0]?.coverArt

  return (
    <div
      className="sona-panel group relative h-full w-full cursor-pointer bg-background-foreground p-5 transition-colors hover:border-primary/35"
      onClick={() => navigateSafe(navigate, ROUTES.LIBRARY.DISCOVER_WEEKLY)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigateSafe(navigate, ROUTES.LIBRARY.DISCOVER_WEEKLY)
        }
      }}
      role="link"
      tabIndex={0}
    >
      {coverArt && (
        <ImageLoader id={coverArt} type="album" size="520">
          {(src) => (
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
          )}
        </ImageLoader>
      )}
      {!coverArt && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent" />
      )}

      <div className="relative z-10 flex h-full min-w-0 flex-col justify-between">
        <div>
          <div className="sona-pill mb-3">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{t('home.weeklyMix')}</span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold leading-tight tracking-[-0.035em]">
              {t('home.discoverWeekly')}
            </h2>
            <p className="mt-1.5 truncate text-xs font-medium leading-snug text-muted-foreground/[0.92]">
              {t('playlist.songCount', { count: playlist.length })}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            onClick={handlePlay}
            className="h-8 gap-1.5 border border-primary/35 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
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
