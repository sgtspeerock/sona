import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ComponentPropsWithoutRef, useEffect, useRef, useState } from 'react'
import { isSafari } from 'react-device-detect'
import { useTranslation } from 'react-i18next'
import { Lrc } from 'react-lrc'
import { Link } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { SongMenuOptions } from '@/app/components/song/menu-options'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@/app/components/ui/context-menu'
import {
  ScrollArea,
  scrollAreaViewportSelector,
} from '@/app/components/ui/scroll-area'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import {
  useLyricsSettings,
  usePlayerCurrentSong,
  usePlayerRef,
} from '@/store/player.store'
import { ILyric } from '@/types/responses/song'

interface LyricProps {
  lyrics: ILyric
}

export function LyricsTab() {
  const currentSong = usePlayerCurrentSong()
  const { preferSyncedLyrics } = useLyricsSettings()
  const { t } = useTranslation()

  const { id, artist, artistId, title, album, albumId, duration, coverArt } =
    currentSong

  const { data: lyrics, isLoading } = useQuery({
    queryKey: ['get-lyrics', artist, title, duration, preferSyncedLyrics],
    queryFn: () =>
      subsonic.lyrics.getLyrics({
        id,
        artist,
        title,
        album,
        duration,
      }),
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const noLyricsFound = t('fullscreen.noLyrics')
  const loadingLyrics = t('fullscreen.loadingLyrics')
  const lyricsAreSynced = lyrics ? areLyricsSynced(lyrics) : false
  const showLyricsStatus = Boolean(
    lyrics?.value && (lyricsAreSynced || preferSyncedLyrics),
  )

  return (
    <div className="flex w-full h-full gap-6">
      {/* Left side - Song Info */}
      <div className="flex-shrink-0 w-[300px] 2xl:w-[380px] flex flex-col gap-4">
        {/* Cover Art */}
        <div className="w-full aspect-square rounded-lg overflow-hidden flex-shrink-0">
          <ImageLoader id={coverArt} type="song" size="500">
            {(src) => (
              <img
                src={src}
                alt={title}
                className="w-full h-full object-cover"
              />
            )}
          </ImageLoader>
        </div>

        {/* Song Details */}
        <div className="flex flex-col gap-1">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <h2 className="text-xl font-bold truncate cursor-pointer hover:text-foreground/95 transition-colors text-shadow-lg">
                {title}
              </h2>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <SongMenuOptions variant="context" song={currentSong} index={0} />
            </ContextMenuContent>
          </ContextMenu>

          {artistId && (
            <Link
              to={ROUTES.ARTIST.PAGE(artistId)}
              className="text-base text-muted-foreground truncate hover:text-foreground transition-colors text-shadow-lg"
            >
              {artist}
            </Link>
          )}
          {!artistId && (
            <p className="text-base text-muted-foreground truncate text-shadow-lg">{artist}</p>
          )}
        </div>
      </div>

      {/* Right side - Lyrics */}
      <div className="relative flex-1 min-w-0">
        {showLyricsStatus && (
          <LyricsStatusPill
            synced={lyricsAreSynced}
            label={
              lyricsAreSynced
                ? t('fullscreen.lyricsStatus.synced', 'Lyrics synced')
                : t('fullscreen.lyricsStatus.unsynced', 'Unsynced lyrics')
            }
          />
        )}
        {isLoading ? (
          <CenteredMessage>{loadingLyrics}</CenteredMessage>
        ) : lyrics && lyrics.value ? (
          lyricsAreSynced ? (
            <SyncedLyrics lyrics={lyrics} />
          ) : (
            <UnsyncedLyrics lyrics={lyrics} />
          )
        ) : (
          <CenteredMessage>{noLyricsFound}</CenteredMessage>
        )}
      </div>
    </div>
  )
}

function LyricsStatusPill({
  synced,
  label,
}: {
  synced: boolean
  label: string
}) {
  return (
    <div
      className={clsx(
        'pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-foreground/90 shadow-sm backdrop-blur-md',
        synced ? 'text-emerald-400/90' : 'text-neutral-300/80',
      )}
    >
      <span
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          synced ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-400',
        )}
      />
      {label}
    </div>
  )
}

function SyncedLyrics({ lyrics }: LyricProps) {
  const playerRef = usePlayerRef()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let rafId = 0

    const tick = () => {
      const next = (playerRef?.currentTime ?? 0) * 1000
      setProgress((prev) => (Math.abs(prev - next) >= 1 ? next : prev))
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [playerRef])

  const skipToTime = (timeMs: number) => {
    if (playerRef) {
      playerRef!.currentTime = timeMs / 1000
    }
  }

  return (
    <div className="w-full h-full text-center font-semibold text-2xl 2xl:text-3xl px-2 lrc-box maskImage-big-player-lyrics">
      <Lrc
        lrc={lyrics.value!}
        recoverAutoScrollInterval={1500}
        currentMillisecond={progress}
        id="sync-lyrics-box"
        className={clsx('h-full overflow-y-auto', !isSafari && 'scroll-smooth')}
        verticalSpace={true}
        lineRenderer={({ active, line }) => (
          <p
            onClick={() => skipToTime(line.startMillisecond)}
            className={clsx(
              'my-6 cursor-pointer transition-all duration-500 motion-reduce:transition-none origin-center transform-gpu',
              active
                ? 'opacity-100 scale-[1.12] text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.7)] font-bold'
                : 'opacity-35 hover:opacity-80 scale-95 hover:scale-[0.98] blur-[0.4px] hover:blur-0',
            )}
          >
            {line.content}
          </p>
        )}
      />
    </div>
  )
}

function UnsyncedLyrics({ lyrics }: LyricProps) {
  const currentSong = usePlayerCurrentSong()
  const lyricsBoxRef = useRef<HTMLDivElement>(null)

  const lines = lyrics.value!.split('\n')

  // biome-ignore lint/correctness/useExhaustiveDependencies: recomputed when song changes
  useEffect(() => {
    if (lyricsBoxRef.current) {
      const scrollArea = lyricsBoxRef.current.querySelector(
        scrollAreaViewportSelector,
      ) as HTMLDivElement

      scrollArea.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }
  }, [currentSong])

  return (
    <ScrollArea
      type="always"
      className="w-full h-full overflow-y-auto text-center font-semibold text-xl 2xl:text-2xl px-2 scroll-smooth maskImage-unsynced-lyrics"
      thumbClassName="secondary-thumb-bar"
      ref={lyricsBoxRef}
    >
      {lines.map((line, index) => (
        <p
          key={index}
          className={clsx(
            'leading-10 text-shadow-lg text-balance',
            index === 0 && 'mt-4',
            index === lines.length - 1 && 'mb-16',
          )}
        >
          {line}
        </p>
      ))}
    </ScrollArea>
  )
}

type CenteredMessageProps = ComponentPropsWithoutRef<'p'>

function CenteredMessage({ children }: CenteredMessageProps) {
  return (
    <div className="w-full h-full flex justify-center items-center">
      <p className="leading-10 text-shadow-lg text-center font-semibold text-xl 2xl:text-2xl">
        {children}
      </p>
    </div>
  )
}

function areLyricsSynced(lyrics: ILyric) {
  // Detect any LRC timestamp line (e.g. [00:12], [01:23.45], [10:02.123]),
  // even when metadata tags like [ar:] or [ti:] appear before timed lines.
  const lyric = lyrics.value?.trim() ?? ''
  return /^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/m.test(lyric)
}
