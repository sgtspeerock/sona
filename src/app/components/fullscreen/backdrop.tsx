import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { isSafari } from 'react-device-detect'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { getSimpleCoverArtUrl } from '@/api/httpClient'
import { ImageLoader } from '@/app/components/image-loader'
import {
  usePlayerCurrentSong,
  useSessionModeSettings,
  useSongColor,
} from '@/store/player.store'
import { hexToRgba } from '@/utils/getAverageColor'

let lastStableFullscreenBackdropUrl = ''

function getImageLuminanceFromElement(image: HTMLImageElement) {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null

    const size = 24
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

    if (count === 0) return null
    return sum / count
  } catch {
    return null
  }
}

function getAdaptiveDimOverlay(
  luminance: number | null,
  mode: 'off' | 'focus' | 'night',
) {
  let opacity = 0.12
  if (luminance !== null) {
    if (luminance >= 0.78) opacity = 0.36
    else if (luminance >= 0.62) opacity = 0.28
    else if (luminance >= 0.48) opacity = 0.2
  }

  if (mode === 'focus') opacity += 0.12
  if (mode === 'night') opacity += 0.06
  return Math.min(0.62, Math.max(0.1, opacity))
}

function useBackdropLuminance(coverUrl: string) {
  const [luminance, setLuminance] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = coverUrl
    image.onload = () => {
      if (cancelled) return
      setLuminance(getImageLuminanceFromElement(image))
    }
    image.onerror = () => {
      if (cancelled) return
      setLuminance(null)
    }

    return () => {
      cancelled = true
    }
  }, [coverUrl])

  return luminance
}

export function FullscreenBackdrop() {
  const { coverArt, title } = usePlayerCurrentSong()
  const {
    useSongColorOnBigPlayer,
    currentSongColor,
    currentSongColorIntensity,
  } = useSongColor()

  const dynamicOverlayStyle = useMemo(() => {
    if (!useSongColorOnBigPlayer) return undefined

    return {
      backgroundColor: currentSongColor ?? 'hsl(var(--primary))',
      opacity: Math.min(currentSongColorIntensity * 0.4, 0.32),
    }
  }, [useSongColorOnBigPlayer, currentSongColor, currentSongColorIntensity])
  const currentCoverUrl = useMemo(
    () => getSimpleCoverArtUrl(coverArt, 'song', '800'),
    [coverArt],
  )
  const [stableBackdropUrl, setStableBackdropUrl] = useState<string>(
    () => lastStableFullscreenBackdropUrl || currentCoverUrl,
  )

  useEffect(() => {
    if (!currentCoverUrl) return
    let cancelled = false
    const image = new Image()
    image.src = currentCoverUrl
    image.onload = () => {
      if (cancelled) return
      lastStableFullscreenBackdropUrl = currentCoverUrl
      setStableBackdropUrl(currentCoverUrl)
    }
    return () => {
      cancelled = true
    }
  }, [currentCoverUrl])

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
      <img
        src={stableBackdropUrl || currentCoverUrl}
        alt={title}
        className="absolute -inset-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)] object-cover"
        style={{
          filter: 'blur(24px) saturate(1.08)',
          transform: 'scale(1.08)',
        }}
      />

      {dynamicOverlayStyle && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={dynamicOverlayStyle}
        />
      )}
    </div>
  )
}
export function ImageBackdrop({
  enableKenBurns,
  blurPx,
  compactBlurSurface,
}: {
  enableKenBurns: boolean
  blurPx: number
  compactBlurSurface: boolean
}) {
  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
      {isSafari ? (
        <MacBackdrop
          enableKenBurns={enableKenBurns}
          blurPx={blurPx}
          compactBlurSurface={compactBlurSurface}
        />
      ) : (
        <OtherBackdrop
          enableKenBurns={enableKenBurns}
          blurPx={blurPx}
          compactBlurSurface={compactBlurSurface}
        />
      )}
    </div>
  )
}

function OtherBackdrop({
  enableKenBurns,
  blurPx,
  compactBlurSurface,
}: {
  enableKenBurns: boolean
  blurPx: number
  compactBlurSurface: boolean
}) {
  const { coverArt } = usePlayerCurrentSong()
  const { mode } = useSessionModeSettings()
  const coverArtUrl = getSimpleCoverArtUrl(coverArt, 'song', '150')
  const luminance = useBackdropLuminance(coverArtUrl)
  const [backgroundImage, setBackgroundImage] = useState(coverArtUrl)

  const newBackgroundImage = useMemo(() => coverArtUrl, [coverArtUrl])

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.src = newBackgroundImage
    img.onload = () => {
      if (!cancelled) setBackgroundImage(newBackgroundImage)
    }
    return () => {
      cancelled = true
    }
  }, [newBackgroundImage])

  const modeFilter =
    mode === 'focus'
      ? 'saturate(0.25) brightness(0.45) contrast(1.04)'
      : mode === 'night'
        ? 'saturate(1.22) brightness(0.6) contrast(1.1)'
        : 'saturate(1) brightness(1)'
  const adaptiveDimOpacity = getAdaptiveDimOverlay(luminance, mode)

  return (
    <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden bg-black/0">
      <div
        className={clsx(
          'absolute bg-cover bg-center z-0',
          compactBlurSurface ? '-inset-2' : '-inset-10',
          enableKenBurns && 'fullscreen-backdrop-kenburns',
        )}
        style={{
          backgroundImage: `url(${backgroundImage})`,
          filter: `blur(${blurPx}px) ${modeFilter}`,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      />
      <div
        className="absolute inset-0 w-full h-full z-[1]"
        style={{ backgroundColor: `rgba(0,0,0,${adaptiveDimOpacity})` }}
      />
      <div
        className="absolute inset-0 w-full h-full z-[2]"
        style={{
          backgroundColor:
            mode === 'focus'
              ? 'hsl(var(--primary) / 0.04)'
              : mode === 'night'
                ? 'hsl(var(--primary) / 0.16)'
                : 'hsl(var(--primary) / 0.1)',
        }}
      />
      <div
        className="absolute inset-0 w-full h-full z-[3]"
        style={{
          backgroundColor:
            mode === 'focus'
              ? 'hsl(var(--background) / 0.72)'
              : mode === 'night'
                ? 'hsl(var(--background) / 0.56)'
                : 'hsl(var(--background) / 0.45)',
        }}
      />
    </div>
  )
}

function MacBackdrop({
  enableKenBurns,
  blurPx,
  compactBlurSurface,
}: {
  enableKenBurns: boolean
  blurPx: number
  compactBlurSurface: boolean
}) {
  const { coverArt, title } = usePlayerCurrentSong()
  const { mode } = useSessionModeSettings()
  const coverArtUrl = getSimpleCoverArtUrl(coverArt, 'song', '150')
  const luminance = useBackdropLuminance(coverArtUrl)
  const { currentSongColor, currentSongColorIntensity } = useSongColor()

  const backgroundColor = useMemo(() => {
    if (!currentSongColor) return undefined

    return hexToRgba(currentSongColor, currentSongColorIntensity)
  }, [currentSongColor, currentSongColorIntensity])

  const modeFilter =
    mode === 'focus'
      ? 'saturate(0.24) brightness(0.45) contrast(1.04)'
      : mode === 'night'
        ? 'saturate(1.2) brightness(0.58) contrast(1.1)'
        : 'saturate(1) brightness(1)'
  const adaptiveDimOpacity = getAdaptiveDimOverlay(luminance, mode)

  return (
    <div
      className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden flex items-center"
      style={{ backgroundColor }}
    >
      <ImageLoader id={coverArt} type="song">
        {(src) => (
          <LazyLoadImage
            key={coverArt}
            src={src}
            alt={title}
            effect="opacity"
            width="100%"
            className={clsx(
              'bg-contain',
              compactBlurSurface ? 'w-[104%] h-[104%] object-cover' : 'w-full',
              enableKenBurns && 'fullscreen-backdrop-kenburns',
            )}
            style={{
              filter: `blur(${blurPx}px) ${modeFilter}`,
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          />
        )}
      </ImageLoader>
      <div
        className="absolute inset-0 z-[9]"
        style={{ backgroundColor: `rgba(0,0,0,${adaptiveDimOpacity})` }}
      />
      <div
        className="absolute inset-0 z-[9]"
        style={{
          backgroundColor:
            mode === 'focus'
              ? 'hsl(var(--primary) / 0.04)'
              : mode === 'night'
                ? 'hsl(var(--primary) / 0.16)'
                : 'hsl(var(--primary) / 0.1)',
        }}
      />
      <div
        className="absolute inset-0 z-10"
        style={{
          backgroundColor:
            mode === 'focus'
              ? 'hsl(var(--background) / 0.72)'
              : mode === 'night'
                ? 'hsl(var(--background) / 0.56)'
                : 'hsl(var(--background) / 0.45)',
        }}
      />
    </div>
  )
}
