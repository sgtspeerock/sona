import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ImageLoader } from '@/app/components/image-loader'
import { PreviewCard } from '@/app/components/preview-card/card'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/app/components/ui/carousel'
import { CarouselButton } from '@/app/components/ui/carousel-button'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import { Albums } from '@/types/responses/album'
import { queryKeys } from '@/utils/queryKeys'
import { scrollPageToTop } from '@/utils/scrollPageToTop'

interface PreviewListProps {
  list: Albums[]
  title: string
  icon?: ReactNode
  showMore?: boolean
  moreTitle?: string
  moreRoute?: string
  showAlbumYearInSubtitle?: boolean
  compact?: boolean
}

export default function PreviewList({
  list,
  title,
  icon,
  showMore = true,
  moreTitle,
  moreRoute,
  showAlbumYearInSubtitle = false,
  compact = false,
}: PreviewListProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null)
  const [canScrollPrev, setCanScrollPrev] = useState<boolean>()
  const [canScrollNext, setCanScrollNext] = useState<boolean>()
  const { setSongList } = usePlayerActions()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  moreTitle = moreTitle || t('generic.seeMore')
  const displayList = list.slice(0, 16)

  async function handlePlayAlbum(album: Albums) {
    if (loadingAlbumId === album.id) return
    setLoadingAlbumId(album.id)

    try {
      const response = await queryClient.ensureQueryData({
        queryKey: [queryKeys.album.single, album.id],
        queryFn: async () => {
          const data = await subsonic.albums.getOne(album.id)
          if (!data) throw new Error('Album not found')
          return data
        },
      })

      if (response) {
        setSongList(response.song, 0)
      }
    } finally {
      setLoadingAlbumId(null)
    }
  }

  useEffect(() => {
    if (!api) {
      return
    }

    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())

    api.on('select', () => {
      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    })
  }, [api])

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2.5 flex items-center justify-between sm:mb-3">
        <div className="flex items-center gap-2">
          {title || icon ? (
            <>
              {icon}
              {title && (
                <h3
                  className="sona-section-title scroll-m-20 sm:text-[1.05rem]"
                  data-testid="preview-list-title"
                >
                  {title}
                </h3>
              )}
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3">
          {showMore && moreRoute && (
            <Link
              to={moreRoute}
              data-testid="preview-list-show-more"
              onClick={() => {
                requestAnimationFrame(() => scrollPageToTop())
              }}
            >
              <p className="truncate text-xs text-muted-foreground hover:text-primary hover:underline sm:text-sm">
                {moreTitle}
              </p>
            </Link>
          )}
          <div className="flex gap-2">
            <CarouselButton
              direction="prev"
              disabled={!canScrollPrev}
              onClick={() => api?.scrollPrev()}
              data-testid="preview-list-prev-button"
            />
            <CarouselButton
              direction="next"
              disabled={!canScrollNext}
              onClick={() => api?.scrollNext()}
              data-testid="preview-list-next-button"
            />
          </div>
        </div>
      </div>

      <div className="transform-gpu">
        <Carousel
          opts={{
            align: 'start',
            slidesToScroll: 'auto',
          }}
          setApi={setApi}
          data-testid="preview-list-carousel"
        >
          <CarouselContent>
            {displayList.map((album, index) => (
              <CarouselItem
                key={album.id}
                className={
                  compact
                    ? 'basis-[clamp(104px,9.5vw,136px)]'
                    : 'basis-[clamp(168px,22vw,256px)]'
                }
                data-testid={`preview-list-carousel-item-${index}`}
              >
                <PreviewCard.Root>
                  <PreviewCard.ImageWrapper link={ROUTES.ALBUM.PAGE(album.id)}>
                    <ImageLoader id={album.coverArt} type="album">
                      {(src) => (
                        <PreviewCard.Image src={src} alt={album.name} />
                      )}
                    </ImageLoader>
                    <PreviewCard.PlayButton
                      onClick={() => handlePlayAlbum(album)}
                      disabled={loadingAlbumId === album.id}
                    />
                  </PreviewCard.ImageWrapper>
                  <PreviewCard.InfoWrapper>
                    <PreviewCard.Title link={ROUTES.ALBUM.PAGE(album.id)}>
                      {album.name}
                    </PreviewCard.Title>
                    <PreviewCard.Subtitle
                      enableLink={album.artistId !== undefined}
                      link={ROUTES.ARTIST.PAGE(album.artistId ?? '')}
                    >
                      {showAlbumYearInSubtitle && album.year
                        ? `${album.artist} • ${album.year}`
                        : album.artist}
                    </PreviewCard.Subtitle>
                  </PreviewCard.InfoWrapper>
                </PreviewCard.Root>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  )
}
