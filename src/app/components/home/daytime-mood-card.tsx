import { CloudSun, Moon, Play, Sun, Sunset } from 'lucide-react'
import type { MouseEvent } from 'react'
import { startTransition, useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { getDaytimePeriod, fetchDaytimeMoodSongs } from '@/service/daytime-mood-manager'
import { usePlayerActions, usePlayerStore } from '@/store/player.store'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

import { SecondaryTileFrame } from '@/app/components/home/secondary-tile'
import { ImageLoader } from '@/app/components/image-loader'

export function DaytimeMoodCard({ layout = 'wide' }: { layout?: 'wide' | 'narrow' }) {
  const { t } = useTranslation()
  const { playDaytimeMoodPlaylist } = usePlayerActions()
  const isDaytimeMoodActive = usePlayerStore((state) => state.playerState.isDaytimeMoodActive)
  const isPlaying = usePlayerStore((state) => state.playerState.isPlaying)
  const aiEnabled = usePlayerStore((state) => state.settings.ai.enabled)
  const period = getDaytimePeriod()

  const [coverArt, setCoverArt] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!aiEnabled) return
    let active = true
    fetchDaytimeMoodSongs(aiEnabled, "")
      .then((songsList) => {
        if (active && songsList && songsList.length > 0) {
          setCoverArt(songsList[0].coverArt)
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [aiEnabled, period])

  const handlePlay = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!aiEnabled) return
    startTransition(() => {
      playDaytimeMoodPlaylist().catch(() => undefined)
    })
  }

  const getVibeConfig = () => {
    switch (period) {
      case 'morning':
        return {
          label: 'Morgen-Fokus',
          title: 'Morgen-Mix',
          desc: 'Sanfter, motivierender Einstieg in den Tag.',
          icon: <Sun className="h-3.5 w-3.5 text-amber-500 animate-spin-slow" />,
          gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
        }
      case 'afternoon':
        return {
          label: 'Mittags-Energie',
          title: 'Mittags-Mix',
          desc: 'Belebender Mix gegen das Nachmittagstief.',
          icon: <CloudSun className="h-3.5 w-3.5 text-sky-500" />,
          gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
        }
      case 'evening':
        return {
          label: 'Abend-Ausklang',
          title: 'Abend-Mix',
          desc: 'Gemütliche Vibes für einen entspannten Feierabend.',
          icon: <Sunset className="h-3.5 w-3.5 text-rose-500 animate-pulse" />,
          gradient: 'from-rose-500/20 via-purple-500/10 to-transparent',
        }
      default:
        return {
          label: 'Nacht-Atmosphäre',
          title: 'Nacht-Mix',
          desc: 'Beruhigende, sphärische Klänge zum Träumen.',
          icon: <Moon className="h-3.5 w-3.5 text-indigo-400" />,
          gradient: 'from-indigo-500/20 via-zinc-900/40 to-transparent',
        }
    }
  }

  const config = getVibeConfig()
  const isActive = isDaytimeMoodActive && isPlaying

  if (layout === 'narrow') {
    return (
      <div
        onClick={() => {
          if (!aiEnabled) return
          startTransition(() => {
            playDaytimeMoodPlaylist().catch(() => undefined)
          })
        }}
        className={cn(
          "h-full w-full text-left relative overflow-hidden rounded-xl",
          !aiEnabled && "opacity-40 cursor-not-allowed pointer-events-none select-none"
        )}
      >
        <SecondaryTileFrame className={isActive ? 'border-primary/50' : ''}>
          {coverArt && (
            <ImageLoader id={coverArt} type="album" size="300">
              {(src) => (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-[0.24] blur-[2px]"
                  style={{ backgroundImage: `url(${src})` }}
                />
              )}
            </ImageLoader>
          )}
          <div className="relative z-10">
            <div className="sona-pill mb-3 w-fit">
              {config.icon}
              <span>Mood-Mix</span>
            </div>
            <h3 className="line-clamp-2 text-[1.06rem] font-semibold leading-[1.12] tracking-[-0.018em] sm:text-[1.14rem]">
              {config.title}
            </h3>
            <p className="mt-1 text-xs font-medium text-muted-foreground/90 line-clamp-1">
              {config.desc}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 relative z-10">
            <Button
              onClick={handlePlay}
              disabled={!aiEnabled}
              className={cn(
                'h-8 gap-1.5 border border-primary/35 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90',
                isActive && 'bg-emerald-600 text-white border-emerald-600/30 hover:bg-emerald-700',
              )}
              size="sm"
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              {isActive ? t('home.daytimeMood.playingShort', 'Aktiv') : t('home.daytimeMood.startShort', 'Starten')}
            </Button>
          </div>
        </SecondaryTileFrame>
      </div>
    )
  }

  return (
    <div
      onClick={() => {
        if (!aiEnabled) return
        startTransition(() => {
          playDaytimeMoodPlaylist().catch(() => undefined)
        })
      }}
      className={cn(
        'sona-panel group relative h-full w-full cursor-pointer bg-background-foreground p-5 transition-all duration-300 hover:border-primary/35 overflow-hidden',
        isActive && 'border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.12)]',
        !aiEnabled && "opacity-40 cursor-not-allowed pointer-events-none select-none"
      )}
    >
      {/* Background Image with Blur */}
      {coverArt && (
        <ImageLoader id={coverArt} type="album" size="520">
          {(src) => (
            <>
              <div
                className="absolute inset-0 scale-[1.13] bg-cover bg-center opacity-[0.34] blur-sm saturate-150"
                style={{ backgroundImage: `url(${src})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/40" />
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
            </>
          )}
        </ImageLoader>
      )}

      {/* Dynamic Background Glow Fallback */}
      {!coverArt && (
        <>
          <div className={cn('absolute inset-0 bg-gradient-to-br transition-opacity duration-500', config.gradient)} />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/40" />
        </>
      )}

      <div className="relative z-10 flex h-full min-w-0 flex-col justify-between">
        <div>
          <div className="sona-pill mb-3 w-fit">
            {config.icon}
            <span>Mood-Mix</span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold leading-tight tracking-[-0.035em]">
              {config.title}
            </h2>
            <p className="mt-1.5 text-xs font-medium leading-snug text-muted-foreground/[0.92] line-clamp-2">
              {config.desc}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            onClick={handlePlay}
            disabled={!aiEnabled}
            className={cn(
              'h-8 gap-1.5 border border-primary/35 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90',
              isActive && 'bg-emerald-600 text-white border-emerald-600/30 hover:bg-emerald-700',
            )}
            size="sm"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            {isActive ? t('home.daytimeMood.playing', 'Läuft') : t('home.daytimeMood.start', 'Mix starten')}
          </Button>
        </div>
      </div>
    </div>
  )
}
