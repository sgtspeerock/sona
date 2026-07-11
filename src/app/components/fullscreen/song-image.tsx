import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useVisualizerContext } from '@/app/components/fullscreen/settings'
import { VISUALIZERS } from '@/app/components/fullscreen/visualizers'
import { ImageLoader } from '@/app/components/image-loader'
import {
  usePlayerStore,
  useSessionModeSettings,
  useSongColor,
} from '@/store/player.store'
import { useFullscreenState } from '@/store/ui.store'

interface FullscreenSongImageProps {
  isChromeVisible?: boolean
}

export function FullscreenSongImage({
  isChromeVisible = true,
}: FullscreenSongImageProps) {
  const { coverArt, artist, title } = usePlayerStore(({ songlist }) => {
    return songlist.currentSong
  })

  const requestedVisualizerActive = useFullscreenState(
    (state) => state.visualizerActive,
  ) as boolean
  const [showVisualizer, setShowVisualizer] = useState(
    requestedVisualizerActive,
  )
  const [renderVisualizerLayer, setRenderVisualizerLayer] = useState(
    requestedVisualizerActive,
  )
  const {
    preset,
    setVisualizerActive,
    renderQuality,
    setRenderQuality,
    autoQualityEnabled,
  } = useVisualizerContext()
  const setFullscreenVisualizerActive = useFullscreenState(
    (state) => state.setVisualizerActive,
  ) as ((active: boolean) => void) | undefined
  const { mode } = useSessionModeSettings()
  const { currentSongColor } = useSongColor()
  const [isCoverSwapping, setIsCoverSwapping] = useState(false)
  const lastCoverRef = useRef<string | undefined>(coverArt)
  const [isHovered, setIsHovered] = useState(false)

  const handlePointerLeave = () => {
    setIsHovered(false)
  }

  useEffect(() => {
    if (lastCoverRef.current === coverArt) return
    lastCoverRef.current = coverArt
    setIsCoverSwapping(true)
    const timeoutId = window.setTimeout(() => setIsCoverSwapping(false), 240)
    return () => window.clearTimeout(timeoutId)
  }, [coverArt])

  const VisualizerComponent = VISUALIZERS[preset]

  useEffect(() => {
    if (requestedVisualizerActive) setShowVisualizer(true)
  }, [requestedVisualizerActive])

  useEffect(() => {
    setVisualizerActive(showVisualizer)
    if (typeof setFullscreenVisualizerActive === 'function') {
      setFullscreenVisualizerActive(showVisualizer)
    }
    return () => {
      setVisualizerActive(false)
      if (typeof setFullscreenVisualizerActive === 'function') {
        setFullscreenVisualizerActive(false)
      }
    }
  }, [setFullscreenVisualizerActive, setVisualizerActive, showVisualizer])

  useEffect(() => {
    if (showVisualizer) {
      setRenderVisualizerLayer(true)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setRenderVisualizerLayer(false)
    }, 320)

    return () => window.clearTimeout(timeoutId)
  }, [showVisualizer])

  useEffect(() => {
    if (!showVisualizer || !autoQualityEnabled) return

    let rafId = 0
    let sampleStartTs = performance.now()
    let sampleFrames = 0
    let lowFpsMs = 0
    let highFpsMs = 0

    const tick = (ts: number) => {
      sampleFrames += 1
      const elapsed = ts - sampleStartTs

      if (elapsed >= 500) {
        const fps = (sampleFrames * 1000) / elapsed

        if (fps < 45) {
          lowFpsMs += elapsed
          highFpsMs = 0
        } else if (fps > 58) {
          highFpsMs += elapsed
          lowFpsMs = 0
        } else {
          lowFpsMs = 0
          highFpsMs = 0
        }

        if (lowFpsMs >= 1500 && renderQuality !== 'lite') {
          setRenderQuality('lite')
          lowFpsMs = 0
          highFpsMs = 0
        }

        if (highFpsMs >= 6000 && renderQuality !== 'high') {
          setRenderQuality('high')
          lowFpsMs = 0
          highFpsMs = 0
        }

        sampleStartTs = ts
        sampleFrames = 0
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [autoQualityEnabled, renderQuality, setRenderQuality, showVisualizer])

  return (
    <div
      className={clsx(
        'relative h-full aspect-square flex-shrink-0 min-h-0 flex items-center justify-center max-h-[595px] 2xl:max-h-[720px] transition-transform duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
        isCoverSwapping && 'fullscreen-song-swap',
        !isChromeVisible && 'scale-[0.992]',
      )}
    >
      {/* Ambient Canvas Glow */}
      {currentSongColor && !showVisualizer && (
        <div
          className="absolute -inset-8 -z-10 rounded-full blur-[90px] pointer-events-none transition-all duration-1000 transform-gpu"
          style={{
            backgroundColor: currentSongColor,
            animation: 'ambient-pulse 8s ease-in-out infinite',
          }}
        />
      )}

      {mode === 'night' && !showVisualizer && (
        <div className="fullscreen-cover-glow pointer-events-none absolute -inset-3 z-0 rounded-[var(--radius-surface)]" />
      )}
      <div
        className={clsx(
          'relative z-10 w-full h-full cursor-pointer transition-all duration-200 ease-out transform-gpu',
          !showVisualizer &&
            'rounded-xl overflow-hidden fullscreen-cover-frame',
        )}
        style={{
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          boxShadow: !showVisualizer
            ? isHovered && currentSongColor
              ? `0 35px 70px -15px ${currentSongColor}77`
              : '0 20px 40px -20px rgba(0,0,0,0.5)'
            : 'none',
        }}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={handlePointerLeave}
        onClick={() => setShowVisualizer(!showVisualizer)}
      >
        <div
          className={clsx(
            'absolute inset-0 transition-opacity duration-300',
            showVisualizer ? 'opacity-0' : 'opacity-100',
          )}
        >
          <ImageLoader id={coverArt} type="song" size={800}>
            {(src, isLoading) => (
              <img
                src={src}
                alt={artist + ' - ' + title}
                className={clsx(
                  'absolute inset-0 w-full h-full object-cover shadow-custom-5 transition-opacity duration-300 opacity-0',
                  !isLoading && 'opacity-100',
                )}
              />
            )}
          </ImageLoader>
        </div>

        {renderVisualizerLayer && (
          <div
            className={clsx(
              'absolute inset-0 transition-opacity duration-300',
              showVisualizer ? 'opacity-100' : 'opacity-0',
            )}
          >
            <VisualizerComponent />
          </div>
        )}
      </div>
    </div>
  )
}
