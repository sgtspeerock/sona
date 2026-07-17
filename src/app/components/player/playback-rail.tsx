import { useQuery } from '@tanstack/react-query'
import { AudioLines, ListMusic, Maximize2, MicVocal } from 'lucide-react'
import {
  ComponentPropsWithoutRef,
  ReactNode,
  RefObject,
  useEffect,
  useRef,
  useState,
} from 'react'
import { isSafari } from 'react-device-detect'
import { useTranslation } from 'react-i18next'
import { Lrc, useRecoverAutoScrollImmediately } from 'react-lrc'
import { Link } from 'react-router-dom'
import { SonaDjButton } from '@/app/components/fullscreen/sona-dj'
import { ImageLoader } from '@/app/components/image-loader'
import { PlayerControls } from '@/app/components/player/controls'
import { PlayerLikeButton } from '@/app/components/player/like-button'
import { PlayerProgress } from '@/app/components/player/progress'
import { PlayerVolume } from '@/app/components/player/volume'
import { SortableQueueList } from '@/app/components/queue/sortable-queue-list'
import { Button } from '@/app/components/ui/button'
import { SimpleTooltip } from '@/app/components/ui/simple-tooltip'
import { getGlobalAnalyser } from '@/app/hooks/use-audio-context'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import {
  useLyricsSettings,
  usePlayerCurrentSong,
  usePlayerIsPlaying,
  usePlayerMediaType,
  usePlayerRef,
  usePlayerSonglist,
} from '@/store/player.store'
import { useFullscreenState } from '@/store/ui.store'

import { Radio } from '@/types/responses/radios'
import { ILyric, ISong } from '@/types/responses/song'

const VISUALIZER_BUFFER_SIZE = 256

interface PlaybackRailProps {
  audioRef: RefObject<HTMLAudioElement>
  song: ISong
  radio: Radio
}

export function PlaybackRail({ audioRef, song, radio }: PlaybackRailProps) {
  const { currentList, currentSong, currentSongIndex } = usePlayerSonglist()
  const { isSong } = usePlayerMediaType()
  const { t } = useTranslation()
  const [activePanel, setActivePanel] = useState<'queue' | 'lyrics'>('queue')
  const [railVisualizerOpen, setRailVisualizerOpen] = useState(false)
  const {
    setOpen: setFullscreenOpen,
    setVisualizerActive: setFullscreenVisualizerActive,
  } = useFullscreenState()
  const hasSong = Boolean(currentSong?.id)
  const hasPlayable = Boolean(song || radio)

  const openFullscreen = (withVisualizer = false) => {
    setFullscreenVisualizerActive(withVisualizer)
    setFullscreenOpen(true)
  }

  return (
    <aside className="fixed bottom-0 right-0 top-[--header-height] z-30 w-[410px] overflow-y-auto overflow-x-hidden border-l border-border/55 bg-background/48 backdrop-blur-sm flex min-[1700px]:w-[440px]">
      <div className="flex min-h-[760px] w-full flex-col p-3">
        <div className="shrink-0 rounded-xl border border-border/30 bg-background/72 p-3 shadow-[0_18px_70px_hsl(var(--background)/0.28)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              Now Playing
            </p>
            <SimpleTooltip text="Fullscreen">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => openFullscreen(false)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </SimpleTooltip>
          </div>

          <button
            type="button"
            className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg text-left outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            onClick={() => setRailVisualizerOpen((current) => !current)}
            disabled={!hasSong}
            aria-label="Toggle sidebar visualizer"
          >
            {railVisualizerOpen && hasSong ? (
              <RailCoverVisualizer title={currentSong.title} />
            ) : hasSong && currentSong.coverArt ? (
              <ImageLoader id={currentSong.coverArt} type="album" size="420">
                {(src) =>
                  src ? (
                    <>
                      <img
                        src={src}
                        alt={currentSong.title}
                        className="relative z-[1] aspect-square h-full w-full rounded-md object-cover"
                      />
                      <div className="absolute inset-0 z-[2] bg-black/0 transition-colors group-hover:bg-black/12" />
                      <div className="absolute inset-0 z-[3] flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white">
                          <AudioLines className="h-4 w-4" />
                        </span>
                      </div>
                    </>
                  ) : null
                }
              </ImageLoader>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/12 to-background">
                <ListMusic className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </button>

          <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr),auto] items-start gap-3">
            {hasSong ? (
              <>
                <div className="min-w-0">
                  <Link
                    to={ROUTES.ALBUM.PAGE(currentSong.albumId)}
                    className="block truncate text-[18px] font-semibold leading-tight tracking-[-0.02em] hover:text-primary"
                  >
                    {currentSong.title}
                  </Link>
                  <Link
                    to={ROUTES.ARTIST.PAGE(currentSong.artistId)}
                    className="mt-1 block w-fit max-w-full truncate text-[13px] text-muted-foreground hover:text-primary"
                  >
                    {currentSong.artist}
                  </Link>
                </div>
                {isSong && <PlayerLikeButton disabled={!song} />}
              </>
            ) : (
              <div className="min-w-0">
                <p className="text-[18px] font-semibold">Nichts läuft gerade</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Starte einen Mix oder ein Album.
                </p>
              </div>
            )}
          </div>

          {isSong && (
            <div className="mt-3">
              <PlayerProgress audioRef={audioRef} layout="rail" />
            </div>
          )}

          <div className="mt-4">
            <PlayerControls
              song={song}
              radio={radio}
              audioRef={audioRef}
              layout="rail"
            />
          </div>

          <div className="mt-2 grid grid-cols-[112px,minmax(0,1fr),72px] items-center gap-2">
            <div className="flex justify-start gap-2">
              <PanelSwitchButton
                active
                onClick={() =>
                  setActivePanel((current) =>
                    current === 'lyrics' ? 'queue' : 'lyrics',
                  )
                }
                disabled={!isSong}
                aria-label={t('fullscreen.lyrics')}
              >
                {activePanel === 'lyrics' ? (
                  <MicVocal className="h-[18px] w-[18px]" />
                ) : (
                  <ListMusic className="h-[18px] w-[18px]" />
                )}
              </PanelSwitchButton>
              {isSong && <SonaDjButton variant="player" />}
            </div>
            <div />
            <div className="flex justify-end">
              <PlayerVolume disabled={!hasPlayable} allowWheel={false} />
            </div>
          </div>
        </div>

        <div className="mb-3 mt-3 flex min-h-[340px] flex-1 flex-col overflow-hidden rounded-xl border border-border/30 bg-background/68 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              {activePanel === 'queue'
                ? t('queue.title')
                : t('fullscreen.lyrics')}
            </p>
            <span className="text-[12px] text-muted-foreground">
              {activePanel === 'queue' ? `${currentList.length} Songs` : ''}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {activePanel === 'lyrics' ? (
              <RailLyricsPanel />
            ) : currentList.length > 0 ? (
              <SortableQueueList
                songs={currentList}
                currentSongIndex={currentSongIndex}
                scrollToIndex
                enableReorder
                compact
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border/45 p-4 text-sm text-muted-foreground">
                Deine Queue erscheint hier, sobald Musik läuft.
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

function RailCoverVisualizer({ title }: { title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isPlaying = usePlayerIsPlaying()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameId = 0
    let rafTime = 0
    let startFrames = 0
    let energyFloor = 0.12
    let energyPeak = 0.42
    let highPresence = 0
    const frequencyData = new Uint8Array(VISUALIZER_BUFFER_SIZE)
    const smoothedData = new Float32Array(VISUALIZER_BUFFER_SIZE)
    const themeColorsRef = {
      current: {
        primary: '0 0% 98%',
        primaryForeground: '0 0% 8%',
      },
    }

    const readThemeColors = () => {
      const styles = getComputedStyle(document.documentElement)
      const primary = styles.getPropertyValue('--primary').trim() || '0 0% 98%'
      const primaryForeground =
        styles.getPropertyValue('--primary-foreground').trim() || '0 0% 8%'

      themeColorsRef.current = { primary, primaryForeground }
    }

    readThemeColors()

    const themeObserver = new MutationObserver(readThemeColors)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time: number) => {
      resize()

      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const analyser = getGlobalAnalyser()

      ctx.clearRect(0, 0, width, height)

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(frequencyData)
        startFrames = Math.min(startFrames + 1, 32)
        for (let i = 0; i < frequencyData.length; i += 1) {
          smoothedData[i] = smoothedData[i] * 0.68 + frequencyData[i] * 0.32
        }
      } else {
        rafTime = time / 760
        startFrames = Math.max(startFrames - 1, 0)
        for (let i = 0; i < frequencyData.length; i += 1) {
          smoothedData[i] =
            smoothedData[i] * 0.78 +
            (42 + Math.sin(rafTime + i * 0.28) * 18) * 0.22
        }
      }

      const centerX = width / 2
      const centerY = height / 2
      const radius = Math.min(width, height) * 0.2
      const bars = 64
      const maxFreqBin = Math.max(1, analyser?.frequencyBinCount ?? 128)
      const rangeStart = Math.min(2, maxFreqBin - 1)
      const rangeEnd = Math.max(rangeStart + 1, Math.min(72, maxFreqBin - 1))
      let sum = 0
      let hiSum = 0
      let hiCount = 0

      for (let i = rangeStart; i <= rangeEnd; i += 1) {
        const value = smoothedData[i] / 255
        sum += value
        if (i >= 64) {
          hiSum += value
          hiCount += 1
        }
      }

      const avg = sum / Math.max(1, rangeEnd - rangeStart + 1)
      energyFloor = Math.min(0.38, energyFloor * 0.986 + avg * 0.014)
      energyPeak = Math.max(
        energyFloor + 0.2,
        Math.max(avg, energyPeak * 0.955),
      )
      highPresence = hiCount > 0 ? hiSum / hiCount : 0
      const warmup =
        analyser && isPlaying ? Math.min(1, startFrames / 18) : 0.42
      const densityLimiter = 0.92

      const getBandNorm = (index: number) => {
        const t = bars <= 1 ? 0 : index / (bars - 1)
        // Keep the low end compact so sub/kick energy does not light up a whole quadrant.
        const curved = Math.pow(t, 1.04)
        const freqIdx = Math.round(
          rangeStart + curved * (rangeEnd - rangeStart),
        )
        const raw = smoothedData[freqIdx] / 255
        const kickWeight = freqIdx < 5 ? 1.12 : freqIdx < 9 ? 1.04 : 1
        const lowWeight = freqIdx < 12 ? 0.78 : freqIdx < 28 ? 0.96 : 1
        const highWeight = freqIdx > 58 ? 0.78 + highPresence * 0.82 : 1
        const weighted = clamp01(raw * lowWeight * highWeight)
        const gate = energyFloor * 0.9 + 0.095
        const localGate = gate + (freqIdx < 9 ? 0.085 : freqIdx < 18 ? 0.04 : 0)
        const range = Math.max(0.22, energyPeak - gate)
        const normalized = clamp01((weighted * kickWeight - localGate) / range)
        const contrasted =
          normalized < 0.12 ? 0 : Math.pow((normalized - 0.12) / 0.88, 1.5)

        return Math.min(1, contrasted * warmup * densityLimiter * 0.8)
      }

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.lineCap = 'round'
      const { primary, primaryForeground } = themeColorsRef.current

      for (let i = 0; i < bars; i += 1) {
        const softened = getBandNorm(i)
        if (softened <= 0.018) continue

        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2
        const length = 2.5 + softened * Math.min(width, height) * 0.27
        const inner = radius
        const outer = radius + length
        const coreStart = inner + length * 0.1
        const coreEnd = outer - length * 0.08

        ctx.strokeStyle = `hsl(${primary} / ${0.16 + softened * 0.74})`
        ctx.lineWidth = 1.05 + softened * 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(angle) * coreStart, Math.sin(angle) * coreStart)
        ctx.lineTo(Math.cos(angle) * coreEnd, Math.sin(angle) * coreEnd)
        ctx.stroke()

        if (softened > 0.12) {
          ctx.strokeStyle = `hsl(${primaryForeground} / ${0.06 + softened * 0.22})`
          ctx.lineWidth = 0.65 + softened * 0.9
          ctx.beginPath()
          ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
          ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
          ctx.stroke()
        }
      }

      ctx.beginPath()
      ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2)
      ctx.strokeStyle = `hsl(${primary} / 0.32)`
      ctx.lineWidth = 1.25
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = `hsl(${primary} / 0.07)`
      ctx.fill()
      ctx.restore()

      frameId = requestAnimationFrame(draw)
    }

    frameId = requestAnimationFrame(draw)
    return () => {
      themeObserver.disconnect()
      cancelAnimationFrame(frameId)
    }
  }, [isPlaying])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[1] h-full w-full"
      aria-label={`${title} visualizer`}
    />
  )
}

function PanelSwitchButton({
  active,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Button> & { active: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'h-10 w-10 rounded-full p-2 text-secondary-foreground hover:bg-transparent hover:text-secondary-foreground',
        active && 'text-primary hover:text-primary',
        className,
      )}
      {...props}
    />
  )
}

function RailLyricsPanel() {
  const currentSong = usePlayerCurrentSong()
  const { preferSyncedLyrics } = useLyricsSettings()
  const { t } = useTranslation()
  const playerRef = usePlayerRef()
  const { signal, recoverAutoScrollImmediately } =
    useRecoverAutoScrollImmediately()
  const unsyncedLyricsRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const { id, artist, title, album, duration } = currentSong

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

  const lyricsAreSynced = lyrics ? areLyricsSynced(lyrics) : false

  useEffect(() => {
    if (!lyricsAreSynced) return
    recoverAutoScrollImmediately()
  }, [lyricsAreSynced, recoverAutoScrollImmediately])

  useEffect(() => {
    if (lyricsAreSynced) return
    unsyncedLyricsRef.current?.scrollTo({ top: 0 })
  }, [lyricsAreSynced])

  useEffect(() => {
    if (!lyricsAreSynced) return
    let rafId = 0

    const tick = () => {
      const next = (playerRef?.currentTime ?? 0) * 1000
      setProgress((prev) => (Math.abs(prev - next) >= 1 ? next : prev))
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [lyricsAreSynced, playerRef])

  if (isLoading) {
    return <RailPanelMessage>{t('fullscreen.loadingLyrics')}</RailPanelMessage>
  }

  if (!lyrics?.value) {
    return <RailPanelMessage>{t('fullscreen.noLyrics')}</RailPanelMessage>
  }

  if (lyricsAreSynced) {
    return (
      <div className="min-h-0 max-w-full flex-1 overflow-hidden rounded-lg bg-background p-3 maskImage-big-player-lyrics">
        <Lrc
          lrc={lyrics.value}
          currentMillisecond={progress}
          recoverAutoScrollInterval={1500}
          recoverAutoScrollSignal={signal}
          className={cn(
            'h-full max-w-full overflow-y-auto overflow-x-hidden text-center text-[15px] font-semibold leading-8 [&_*]:max-w-full [&_*]:overflow-x-hidden',
            !isSafari && 'scroll-smooth',
          )}
          style={{ overflowX: 'hidden' }}
          verticalSpace
          lineRenderer={({ active, line }) => (
            <p
              className={cn(
                'my-2 w-full max-w-full break-words px-2 transition-[color,opacity] duration-300',
                active
                  ? 'text-foreground opacity-100'
                  : 'text-muted-foreground opacity-55',
              )}
            >
              {line.content}
            </p>
          )}
        />
      </div>
    )
  }

  return (
    <div
      ref={unsyncedLyricsRef}
      className="min-h-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg bg-background p-4 text-center text-[14px] font-medium leading-8 text-foreground/85 [&_*]:max-w-full [&_*]:overflow-x-hidden"
    >
      {lyrics.value.split('\n').map((line, index) => (
        <p key={`${index}-${line}`} className="max-w-full break-words">
          {line}
        </p>
      ))}
    </div>
  )
}

function RailPanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 max-w-full flex-1 items-center justify-center overflow-x-hidden rounded-lg border border-dashed border-border/45 bg-background p-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function areLyricsSynced(lyrics: ILyric) {
  const lyric = lyrics.value?.trim() ?? ''
  return /^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/m.test(lyric)
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
