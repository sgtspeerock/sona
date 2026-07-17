import { ImageLoader } from '@/app/components/image-loader'

interface PanelBackgroundProps {
  coverArt?: string
  type?: 'album' | 'artist'
  size?: string
}

export function PanelBackground({
  coverArt,
  type = 'album',
  size = '520',
}: PanelBackgroundProps) {
  if (!coverArt) {
    return <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent" />
  }

  return (
    <ImageLoader id={coverArt} type={type} size={size}>
      {(src) =>
        src ? (
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
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent" />
        )
      }
    </ImageLoader>
  )
}
