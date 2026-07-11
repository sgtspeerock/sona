import clsx from 'clsx'
import { type SyntheticEvent, useState } from 'react'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import { getSimpleCoverArtUrl } from '@/api/httpClient'
import {
  AlbumArtistInfo,
  AlbumMultipleArtistsInfo,
} from '@/app/components/album/artists'
import { AlbumHeaderFallback } from '@/app/components/fallbacks/album-fallbacks'
import { BadgesData, HeaderInfoGenerator } from '@/app/components/header-info'
import { ImageLoader } from '@/app/components/image-loader'
import { CustomLightBox } from '@/app/components/lightbox'
import { cn } from '@/lib/utils'
import { CoverArt } from '@/types/coverArtType'
import { IFeaturedArtist } from '@/types/responses/artist'
import { getTextSizeClass } from '@/utils/getTextSizeClass'

interface ImageHeaderProps {
  type: string
  title: string
  subtitle?: string
  artistId?: string
  artists?: IFeaturedArtist[]
  coverArtId?: string
  coverArtType: CoverArt
  coverArtSize: string
  coverArtAlt: string
  badges: BadgesData
  isPlaylist?: boolean
  variant?: 'release' | 'artist'
}

export default function ImageHeader({
  type,
  title,
  subtitle,
  artistId,
  artists,
  coverArtId,
  coverArtType,
  coverArtSize,
  coverArtAlt,
  badges,
  isPlaylist = false,
  variant = 'release',
}: ImageHeaderProps) {
  const [open, setOpen] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(0.42)
  const fallbackCoverSrc = getSimpleCoverArtUrl(
    undefined,
    coverArtType,
    coverArtSize,
  )

  function calculateImageLuminance(image: HTMLImageElement) {
    try {
      const sampleSize = 24
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return null

      canvas.width = sampleSize
      canvas.height = sampleSize
      context.drawImage(image, 0, 0, sampleSize, sampleSize)
      const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data

      let weightedSum = 0
      let pixelCount = 0
      for (let i = 0; i < pixels.length; i += 4) {
        const alpha = pixels[i + 3] / 255
        if (alpha < 0.1) continue

        const red = pixels[i] / 255
        const green = pixels[i + 1] / 255
        const blue = pixels[i + 2] / 255
        const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
        weightedSum += luminance * alpha
        pixelCount += alpha
      }

      if (pixelCount === 0) return null
      return weightedSum / pixelCount
    } catch {
      return null
    }
  }

  function applyAdaptiveOverlayByLuminance(luminance: number | null) {
    if (luminance === null) {
      setOverlayOpacity(0.42)
      return
    }

    if (luminance >= 0.78) {
      setOverlayOpacity(0.68)
      return
    }
    if (luminance >= 0.62) {
      setOverlayOpacity(0.56)
      return
    }
    if (luminance >= 0.48) {
      setOverlayOpacity(0.48)
      return
    }
    setOverlayOpacity(0.38)
  }

  function getImage() {
    return document.getElementById('cover-art-image') as HTMLImageElement
  }

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    const img = getImage()
    if (!img) return

    img.crossOrigin = null
    setOverlayOpacity(0.46)

    const currentSrc = event.currentTarget.src ?? ''
    if (!currentSrc.includes('/default_') && fallbackCoverSrc) {
      event.currentTarget.src = fallbackCoverSrc
    }
  }

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const luminance = calculateImageLuminance(event.currentTarget)
    applyAdaptiveOverlayByLuminance(luminance)
  }

  const hasMultipleArtists = artists ? artists.length > 1 : false
  const isArtistVariant = variant === 'artist'

  return (
    <ImageLoader id={coverArtId} type={coverArtType} size={coverArtSize}>
      {(src, isLoading) =>
        (() => {
          const resolvedDisplaySrc = src || fallbackCoverSrc
          const usesExternalUrl = /^https?:\/\//i.test(resolvedDisplaySrc)
          const shouldUseAnonymousCors = !usesExternalUrl
          return (
            <div className="relative pb-6" key={`header-${coverArtId}`}>
              <div
                className="pointer-events-none absolute inset-x-8 bottom-0 h-24 rounded-b-[var(--radius-surface-lg)] bg-[linear-gradient(180deg,hsl(var(--primary)/0.13),hsl(var(--background)/0))] blur-2xl"
                aria-hidden="true"
              />
              <div
                className={cn(
                  'relative mx-8 mt-5 flex w-auto overflow-hidden rounded-[var(--radius-surface-lg)] border border-border/35 bg-card/82 shadow-[0_18px_70px_hsl(var(--background)/0.24)]',
                  isArtistVariant
                    ? 'h-[232px] 2xl:h-[270px]'
                    : 'h-[266px] 2xl:h-[316px]',
                )}
              >
                {isLoading && (
                  <div className="absolute inset-0 z-20">
                    <AlbumHeaderFallback />
                  </div>
                )}

                {/* Blurred background image */}
                {!isLoading && src && (
                  <div className="absolute inset-0 z-0 overflow-visible">
                    <img
                      src={resolvedDisplaySrc}
                      alt=""
                      aria-hidden="true"
                      className={cn(
                        'h-full w-full scale-110 object-cover opacity-80 saturate-125',
                        isArtistVariant && 'object-top',
                      )}
                      style={{
                        filter: 'blur(18px)',
                      }}
                    />
                    {!isArtistVariant && (
                      <img
                        src={resolvedDisplaySrc}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-y-0 right-0 h-full w-[52%] scale-105 object-cover object-center opacity-60 saturate-125"
                        style={{
                          WebkitMaskImage:
                            'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.8) 34%, rgba(0,0,0,1) 100%)',
                          maskImage:
                            'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.8) 34%, rgba(0,0,0,1) 100%)',
                        }}
                      />
                    )}
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                      style={{
                        background: isArtistVariant
                          ? 'linear-gradient(90deg, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / var(--sona-header-overlay-mid)) 54%, hsl(var(--background) / 0.46) 100%), radial-gradient(circle at 74% 22%, hsl(var(--primary) / 0.18), transparent 42%)'
                          : 'linear-gradient(90deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / var(--sona-header-overlay-mid)) 46%, hsl(var(--background) / 0.34) 100%), linear-gradient(180deg, hsl(var(--primary) / 0.16) 0%, transparent 58%)',
                        // CSS custom prop keeps style readable and allows smooth updates.
                        ['--sona-header-overlay-mid' as string]:
                          overlayOpacity.toFixed(2),
                      }}
                    />
                  </div>
                )}

                <div
                  className={cn(
                    'w-full px-9 py-7 flex gap-6 absolute inset-0 z-10',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={cn(
                      isArtistVariant
                        ? 'h-[172px] min-h-[172px] w-[172px] min-w-[172px] 2xl:h-[208px] 2xl:min-h-[208px] 2xl:w-[208px] 2xl:min-w-[208px]'
                        : 'h-[212px] min-h-[212px] w-[212px] min-w-[212px] 2xl:h-[262px] 2xl:min-h-[262px] 2xl:w-[262px] 2xl:min-w-[262px]',
                      'aspect-square bg-transparent',
                      isArtistVariant
                        ? 'rounded-full'
                        : 'rounded-[var(--radius-surface-lg)]',
                      'group overflow-hidden border border-border/40 bg-background/70',
                      isArtistVariant &&
                        'border-primary/35 shadow-[0_0_0_6px_hsl(var(--primary)/0.08)]',
                      'transition-transform duration-150 ease-out',
                      'focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none',
                    )}
                  >
                    <LazyLoadImage
                      key={coverArtId}
                      effect="opacity"
                      crossOrigin={
                        shouldUseAnonymousCors ? 'anonymous' : undefined
                      }
                      id="cover-art-image"
                      src={resolvedDisplaySrc}
                      alt={coverArtAlt}
                      className={cn(
                        'aspect-square h-full w-full object-cover transition-transform duration-150 ease-out will-change-transform group-hover:scale-[1.02]',
                        isArtistVariant
                          ? 'rounded-full object-top'
                          : 'rounded-[var(--radius-surface-lg)]',
                      )}
                      width="100%"
                      height="100%"
                      onError={handleError}
                      onLoad={handleImageLoad}
                    />
                  </button>

                  <div className="z-10 flex w-full max-w-[calc(100%-236px)] flex-col justify-center 2xl:max-w-[calc(100%-286px)]">
                    <p className="mb-5 w-fit rounded-full border border-border/45 bg-background/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-[0_10px_30px_hsl(var(--background)/0.22)]">
                      {type}
                    </p>
                    <h1
                      className={clsx(
                        'max-w-full scroll-m-20 font-bold tracking-[-0.04em] antialiased text-shadow-md break-words line-clamp-2',
                        getTextSizeClass(title),
                      )}
                    >
                      {title}
                    </h1>

                    {!isPlaylist && artists && hasMultipleArtists && (
                      <div className="mt-4 flex items-center">
                        <AlbumMultipleArtistsInfo artists={artists} />
                        <HeaderInfoGenerator badges={badges} />
                      </div>
                    )}

                    {!isPlaylist && subtitle && !hasMultipleArtists && (
                      <>
                        {artistId ? (
                          <div className="mt-4 flex items-center">
                            <AlbumArtistInfo id={artistId} name={subtitle} />
                            <HeaderInfoGenerator badges={badges} />
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground text-shadow-md">
                            {subtitle}
                          </p>
                        )}
                      </>
                    )}

                    {isPlaylist && subtitle && (
                      <>
                        <p className="mb-3 mt-3 max-w-3xl text-sm text-muted-foreground text-shadow-md line-clamp-2">
                          {subtitle}
                        </p>
                        <HeaderInfoGenerator
                          badges={badges}
                          showFirstDot={false}
                        />
                      </>
                    )}

                    {!subtitle && (
                      <div className="mt-4">
                        <HeaderInfoGenerator
                          badges={badges}
                          showFirstDot={false}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <CustomLightBox
                  open={open}
                  close={setOpen}
                  src={resolvedDisplaySrc}
                  alt={coverArtAlt}
                />
              </div>
            </div>
          )
        })()
      }
    </ImageLoader>
  )
}
