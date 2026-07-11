import { clsx } from 'clsx'
import {
  HeartIcon,
  Maximize2Icon,
  Music2Icon,
  PauseIcon,
  PinIcon,
  PinOffIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from 'lucide-react'
import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type WheelEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { MarqueeTitle } from '@/app/components/fullscreen/marquee-title'
import { ImageLoader } from '@/app/components/image-loader'
import { MiniPlayerProgress } from '@/app/components/mini-player/progress'
import { Button } from '@/app/components/ui/button'
import { SimpleTooltip } from '@/app/components/ui/simple-tooltip'
import { useTimeoutController } from '@/app/hooks/use-timeout-controller'
import {
  usePlayerActions,
  usePlayerCurrentSong,
  usePlayerIsPlaying,
  usePlayerLoop,
  usePlayerPrevAndNext,
  usePlayerSonglist,
  usePlayerSongStarred,
  usePlayerVolume,
  useSongColor,
} from '@/store/player.store'
import { useMiniPlayerState } from '@/store/ui.store'
import { LoopState } from '@/types/playerContext'

export function MiniPlayerModePage() {
  const { t } = useTranslation()
  const { setOpen, pinned, togglePinned } = useMiniPlayerState()
  const { hasPrev, hasNext } = usePlayerPrevAndNext()
  const { volume, handleVolumeWheel } = usePlayerVolume()
  const isSongStarred = usePlayerSongStarred()
  const isPlaying = usePlayerIsPlaying()
  const loopState = usePlayerLoop()
  const song = usePlayerCurrentSong()
  const { currentList, currentSongIndex } = usePlayerSonglist()
  const { togglePlayPause, playPrevSong, playNextSong, starCurrentSong } =
    usePlayerActions()
  const { currentSongColor } = useSongColor()
  const hasMiniPlayerApi =
    typeof window !== 'undefined' &&
    typeof window.api?.setMiniPlayerMode === 'function'
  const coverSize = useMemo(() => {
    if (typeof window === 'undefined') return 106
    const raw = getComputedStyle(document.documentElement).getPropertyValue(
      '--header-height',
    )
    const headerHeight = Number.parseFloat(raw) || 44
    return Math.round(headerHeight * 2.4)
  }, [])
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window === 'undefined') return 198
    return window.innerHeight || document.documentElement?.clientHeight || 198
  })

  const syncViewportHeight = useCallback(() => {
    if (typeof window === 'undefined') return
    setViewportHeight(
      window.innerHeight || document.documentElement?.clientHeight || 198,
    )
  }, [])

  useEffect(() => {
    if (!hasMiniPlayerApi) return
    window.api.setMiniPlayerMode(true)
    // Window bounds change asynchronously; resync layout shortly after entering mini mode.
    const t1 = setTimeout(syncViewportHeight, 0)
    const t2 = setTimeout(syncViewportHeight, 80)
    const t3 = setTimeout(syncViewportHeight, 180)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      window.api.setMiniPlayerMode(false)
    }
  }, [hasMiniPlayerApi, syncViewportHeight])

  useLayoutEffect(() => {
    syncViewportHeight()
  }, [syncViewportHeight])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => syncViewportHeight()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [syncViewportHeight])

  useEffect(() => {
    if (!hasMiniPlayerApi) return
    window.api.setMiniPlayerPinned(pinned)
  }, [hasMiniPlayerApi, pinned])

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [setOpen])

  const resolvedSong = useMemo(() => {
    const listSong = currentList[currentSongIndex]
    if (!song && !listSong) return song
    return {
      ...listSong,
      ...song,
      coverArt: song?.coverArt ?? listSong?.coverArt,
      albumId: song?.albumId ?? listSong?.albumId,
      artist: song?.artist ?? listSong?.artist,
      title: song?.title ?? listSong?.title,
      album: song?.album ?? listSong?.album,
      id: song?.id ?? listSong?.id,
    }
  }, [song, currentList, currentSongIndex])

  const title =
    resolvedSong?.title ?? t('player.noPlayback', 'No playback active.')
  const artist = resolvedSong?.artist ?? ''
  const hasSong = Boolean(
    resolvedSong?.id ||
      resolvedSong?.title ||
      resolvedSong?.artist ||
      resolvedSong?.album,
  )
  const coverSource = resolvedSong?.coverArt
    ? { id: resolvedSong.coverArt, type: 'song' as const }
    : resolvedSong?.albumId
      ? { id: resolvedSong.albumId, type: 'album' as const }
      : resolvedSong?.id
        ? { id: resolvedSong.id, type: 'song' as const }
        : null
  const [isIdle, setIsIdle] = useState(false)
  const [showVolumeOverlay, setShowVolumeOverlay] = useState(false)
  const [backgroundDimOpacity, setBackgroundDimOpacity] = useState(0.42)
  const idleTimer = useTimeoutController()
  const volumeOverlayTimer = useTimeoutController()
  const coverDisplaySize = isIdle ? Math.round(coverSize * 1.34) : coverSize
  const utilityButtonsHeight = 32
  const utilityToCoverGap = 6
  const activeGroupHeight = utilityButtonsHeight + utilityToCoverGap + coverSize
  const activeGroupTop = Math.max(
    8,
    Math.round((viewportHeight - activeGroupHeight) / 2),
  )
  const coverTop = isIdle
    ? Math.max(3, Math.round((viewportHeight - coverDisplaySize) / 2))
    : activeGroupTop + utilityButtonsHeight + utilityToCoverGap
  const actionButtonsTop = isIdle
    ? coverTop + coverDisplaySize + 6
    : activeGroupTop

  const clearIdleTimer = useCallback(() => {
    idleTimer.clear()
  }, [idleTimer])

  const startIdleTimer = useCallback(() => {
    idleTimer.schedule(() => {
      setIsIdle(true)
    }, 3000)
  }, [idleTimer])

  const handleMiniPlayerWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    handleVolumeWheel(event.deltaY > 0)

    setShowVolumeOverlay(true)
    volumeOverlayTimer.schedule(() => {
      setShowVolumeOverlay(false)
    }, 850)
  }

  const handleBackgroundImageLoad = (
    event: SyntheticEvent<HTMLImageElement>,
  ) => {
    try {
      const image = event.currentTarget
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return

      const size = 22
      canvas.width = size
      canvas.height = size
      context.drawImage(image, 0, 0, size, size)
      const data = context.getImageData(0, 0, size, size).data

      let sum = 0
      let count = 0
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255
        if (alpha < 0.1) continue
        const red = data[i] / 255
        const green = data[i + 1] / 255
        const blue = data[i + 2] / 255
        sum += (0.2126 * red + 0.7152 * green + 0.0722 * blue) * alpha
        count += alpha
      }

      if (count <= 0) return
      const luminance = sum / count
      if (luminance >= 0.78) {
        setBackgroundDimOpacity(0.56)
        return
      }
      if (luminance >= 0.62) {
        setBackgroundDimOpacity(0.5)
        return
      }
      if (luminance >= 0.48) {
        setBackgroundDimOpacity(0.45)
        return
      }
      setBackgroundDimOpacity(0.4)
    } catch {
      setBackgroundDimOpacity(0.42)
    }
  }

  useEffect(() => {
    // Entering mini-player should always start in active mode.
    setIsIdle(false)
    clearIdleTimer()
  }, [clearIdleTimer])

  useEffect(() => {
    // On track updates, reset idle once so controls/cover stay visible.
    if (resolvedSong?.id || resolvedSong?.title) {
      setIsIdle(false)
      clearIdleTimer()
    }
  }, [resolvedSong?.id, resolvedSong?.title, clearIdleTimer])

  useEffect(() => {
    return () => {
      clearIdleTimer()
      volumeOverlayTimer.clear()
    }
  }, [volumeOverlayTimer, clearIdleTimer])

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-black"
      style={{
        background: currentSongColor
          ? `radial-gradient(120% 120% at 15% 15%, ${currentSongColor}22 0%, transparent 55%), #06070a`
          : '#06070a',
      }}
      onMouseEnter={() => {
        clearIdleTimer()
        setIsIdle(false)
      }}
      onMouseLeave={startIdleTimer}
      onWheelCapture={handleMiniPlayerWheel}
    >
      {hasSong && coverSource ? (
        <ImageLoader id={coverSource.id} type={coverSource.type} size={500}>
          {(src) => (
            <LazyLoadImage
              src={src}
              width="100%"
              height="100%"
              loading="eager"
              effect="opacity"
              className="absolute inset-0 z-0 h-full w-full object-cover object-center blur-3xl scale-[1.2] opacity-55 fullscreen-bg-kenburns"
              alt=""
              onLoad={handleBackgroundImageLoad}
            />
          )}
        </ImageLoader>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-accent/35 via-background/80 to-background/95" />
      )}

      <div
        className="absolute inset-0 z-10 transition-colors duration-500"
        style={{ backgroundColor: `rgba(0,0,0,${backgroundDimOpacity})` }}
      />
      <div className="hypnotic-layer-a z-10" />
      <div className="hypnotic-layer-b z-10" />
      <div className="hypnotic-layer-c z-10" />

      <header className="absolute top-0 left-0 right-0 z-40 h-header bg-transparent electron-drag">
        <div className="h-full px-2 flex items-center justify-between">
          <div className="flex items-center gap-1" />
        </div>
      </header>

      <div
        className={clsx(
          'absolute left-[12px] top-[26px] z-[45] shrink-0 overflow-hidden rounded-lg border border-white/24 bg-black/24 shadow-xl shadow-black/40',
          'transition-[width,height,top,transform,opacity] duration-650 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]',
        )}
        style={{
          width: `${coverDisplaySize}px`,
          height: `${coverDisplaySize}px`,
          top: `${coverTop}px`,
        }}
      >
        {hasSong && coverSource ? (
          <ImageLoader id={coverSource.id} type={coverSource.type} size={500}>
            {(src) => (
              <LazyLoadImage
                src={src}
                width="100%"
                height="100%"
                loading="eager"
                effect="opacity"
                className="h-full w-full object-cover object-center"
                alt={`${resolvedSong?.artist ?? ''} - ${resolvedSong?.title ?? ''}`}
              />
            )}
          </ImageLoader>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/35 via-background/70 to-background text-white/85">
            <Music2Icon className="h-10 w-10 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]" />
          </div>
        )}
        <div
          className={clsx(
            'pointer-events-none absolute inset-0 z-[1] bg-black/60 transition-opacity duration-200',
            showVolumeOverlay ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={clsx(
            'pointer-events-none absolute inset-0 z-[2] flex items-center justify-center transition-opacity duration-200',
            showVolumeOverlay ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="rounded-lg border border-white/25 bg-black/55 px-3 py-1.5 text-[16px] font-semibold text-white shadow-lg shadow-black/40">
            {volume}%
          </div>
        </div>
      </div>

      <div
        className={clsx(
          'absolute left-[12px] z-[46] flex items-center gap-0 overflow-hidden rounded-lg border border-white/28 bg-black/66 p-0 shadow-lg shadow-black/45 backdrop-blur-lg',
          'transition-[top,width,transform,opacity,background-color,border-color] duration-620 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]',
          isIdle && 'opacity-0 translate-y-1 pointer-events-none',
        )}
        style={{
          top: `${actionButtonsTop}px`,
          width: `${isIdle ? coverDisplaySize : coverSize}px`,
        }}
      >
        <SimpleTooltip
          text={t('player.tooltips.miniPlayer.expand', 'Expand Player')}
        >
          <Button
            variant="ghost"
            className="h-8 flex-1 rounded-none rounded-l-lg border-r border-white/18 bg-primary/30 text-primary-foreground/95 transition-colors hover:bg-primary/40"
            onClick={() => setOpen(false)}
          >
            <Maximize2Icon className="h-4 w-4" />
          </Button>
        </SimpleTooltip>

        <SimpleTooltip
          text={
            pinned
              ? t('player.tooltips.miniPlayer.unpin', 'Unpin Miniplayer')
              : t('player.tooltips.miniPlayer.pin', 'Pin Miniplayer')
          }
        >
          <Button
            variant="ghost"
            className={clsx(
              'h-8 flex-1 rounded-none rounded-r-lg transition-colors',
              pinned
                ? 'bg-primary text-primary-foreground hover:bg-primary/88'
                : 'bg-primary/30 text-primary-foreground/95 hover:bg-primary/40',
            )}
            onClick={togglePinned}
          >
            {pinned ? (
              <PinIcon className="h-4 w-4" />
            ) : (
              <PinOffIcon className="h-4 w-4" />
            )}
          </Button>
        </SimpleTooltip>
      </div>

      <main
        className={clsx(
          'absolute inset-0 z-40 pr-2 pb-0 pt-0 transition-[padding] duration-620 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]',
          isIdle
            ? 'pl-[calc(var(--header-height)*2.9+24px)]'
            : 'pl-[calc(var(--header-height)*2.4+34px)]',
        )}
      >
        <div className="h-full flex">
          <div className="min-w-0 flex-1 h-full flex flex-col justify-end">
            <div
              className={clsx(
                'min-w-0 pt-[25px] transition-[transform,opacity] duration-620 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]',
                isIdle && 'translate-x-[10px]',
              )}
            >
              {hasSong ? (
                <>
                  <div
                    className={clsx(
                      'font-semibold text-white tracking-[0.01em] drop-shadow-[0_1px_5px_rgba(0,0,0,0.68)] transition-all duration-500 ease-out',
                      isIdle ? 'text-[15px]' : 'text-[13px] truncate',
                    )}
                  >
                    {isIdle ? (
                      <MarqueeTitle gap="mr-10">{title}</MarqueeTitle>
                    ) : (
                      title
                    )}
                  </div>
                  <div
                    className={clsx(
                      'text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.52)] transition-all duration-500 ease-out',
                      isIdle ? 'text-[13px]' : 'text-[11px] truncate',
                    )}
                  >
                    {isIdle ? (
                      <MarqueeTitle gap="mr-8">{artist || ' '}</MarqueeTitle>
                    ) : (
                      artist || ' '
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-white/14 bg-black/28 px-2.5 py-2">
                  <div className="text-[13px] font-semibold text-white">
                    {t('player.noPlayback', 'No playback active.')}
                  </div>
                  <div className="text-[11px] text-white/72">
                    {t(
                      'player.noPlaybackMiniHint',
                      'Play a song to show controls and progress.',
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className={clsx(
                'mt-auto mb-2.5 flex items-center gap-1.5 rounded-xl bg-black/24 px-1.5 py-1 transition-[transform,opacity] duration-620 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] backdrop-blur-sm',
                (isIdle || !hasSong) &&
                  'opacity-0 translate-y-2 pointer-events-none',
              )}
            >
              <SimpleTooltip text={t('player.tooltips.previous')}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={clsx(
                    'w-[54px] h-10 rounded-lg relative border border-white/20',
                    'text-primary-foreground hover:text-primary-foreground bg-white/14 hover:bg-white/22',
                    'hover:scale-105 transition-transform will-change-transform',
                  )}
                  onClick={playPrevSong}
                  disabled={!hasPrev}
                >
                  <SkipBackIcon className="w-5 h-5 text-primary fill-primary drop-shadow-lg" />
                </Button>
              </SimpleTooltip>

              <SimpleTooltip
                text={
                  isPlaying
                    ? t('player.tooltips.pause')
                    : t('player.tooltips.play')
                }
              >
                <Button
                  variant="link"
                  size="icon"
                  className="w-[50px] h-11 rounded-lg border border-white/75 bg-white/95 text-black hover:bg-white hover:scale-105 transition-transform will-change-transform shadow-[0_2px_10px_rgba(255,255,255,0.15)]"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? (
                    <PauseIcon className="w-5 h-5 text-black fill-black" />
                  ) : (
                    <PlayIcon className="w-5 h-5 text-black fill-black" />
                  )}
                </Button>
              </SimpleTooltip>

              <SimpleTooltip text={t('player.tooltips.next')}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={clsx(
                    'w-[54px] h-10 rounded-lg relative border border-white/20',
                    'text-primary-foreground hover:text-primary-foreground',
                    'bg-white/14 hover:bg-white/22 hover:scale-105 transition-transform will-change-transform',
                  )}
                  onClick={playNextSong}
                  disabled={!hasNext && loopState !== LoopState.All}
                >
                  <SkipForwardIcon className="w-5 h-5 text-primary fill-primary drop-shadow-lg" />
                </Button>
              </SimpleTooltip>

              <SimpleTooltip
                text={
                  isSongStarred
                    ? t('player.tooltips.dislike', {
                        defaultValue: 'Remove like',
                        song: title,
                        artist,
                      })
                    : t('player.tooltips.like', {
                        defaultValue: 'Like',
                        song: title,
                        artist,
                      })
                }
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className={clsx(
                    'w-[44px] h-10 rounded-lg relative border border-white/20',
                    'text-primary-foreground hover:text-primary-foreground',
                    'bg-white/14 hover:bg-white/22 hover:scale-105 transition-transform will-change-transform',
                  )}
                  onClick={starCurrentSong}
                >
                  <HeartIcon
                    className={clsx(
                      'w-5 h-5',
                      isSongStarred
                        ? 'text-red-500 fill-red-500'
                        : 'text-secondary-foreground',
                    )}
                  />
                </Button>
              </SimpleTooltip>
            </div>

            <div
              className={clsx(
                'mt-auto transition-[padding,width] duration-620 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]',
                isIdle ? 'pr-6 pb-6 pl-[12px]' : 'pr-1 pb-6 pl-[6px]',
              )}
            >
              {hasSong ? (
                <MiniPlayerProgress />
              ) : (
                <div className="h-[10px] w-full rounded-full bg-white/12" />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
