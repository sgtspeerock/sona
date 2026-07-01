import { ReactNode } from 'react'
import { ImageLoader } from '@/app/components/image-loader'
import { cn } from '@/lib/utils'

type SecondaryTileImageType = 'album' | 'artist'

interface SecondaryTileFrameProps {
  children: ReactNode
  coverArt?: string
  imageType?: SecondaryTileImageType
  imageSize?: string
  imagePosition?: string
  className?: string
  disabled?: boolean
}

export function SecondaryTileFrame({
  children,
  coverArt,
  imageType = 'album',
  imageSize = '520',
  imagePosition = 'center',
  className,
  disabled = false,
}: SecondaryTileFrameProps) {
  return (
    <div
      className={cn(
        'sona-panel h-full min-h-[154px] bg-background-foreground p-4 transition-colors hover:border-border/70 sm:min-h-[166px]',
        disabled && 'cursor-default opacity-75',
        className,
      )}
    >
      {coverArt && (
        <ImageLoader id={coverArt} type={imageType} size={imageSize}>
          {(src) =>
            src ? (
              <>
                <div
                  className="absolute inset-0 scale-105 bg-cover opacity-[0.28] saturate-125"
                  style={{
                    backgroundImage: `url(${src})`,
                    backgroundPosition: imagePosition,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background/92 via-background/82 to-background/62" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/58 to-transparent" />
              </>
            ) : null
          }
        </ImageLoader>
      )}

      <div className="relative z-[1] flex h-full min-w-0 flex-col justify-between">
        {children}
      </div>
    </div>
  )
}
