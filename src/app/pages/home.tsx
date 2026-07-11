import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  HeaderFallback,
  PreviewListFallback,
} from '@/app/components/fallbacks/home-fallbacks'
import AlbumHeader from '@/app/components/home/carousel/album-header'
import { DiscoverWeeklyCard } from '@/app/components/home/discover-weekly-card'
import GenreDiscovery, {
  SessionEnergyCard,
} from '@/app/components/home/genre-discovery'
import { RecentAddedColumn } from '@/app/components/home/recent-added-column'
import { ThisIsArtist } from '@/app/components/home/this-is-artist'
import { PageState } from '@/app/components/ui/page-state'
import {
  useGetLatestReleaseAlbum,
  useHomeDashboardData,
} from '@/app/hooks/use-home'
import { useRenderCounter } from '@/app/hooks/use-render-counter'

export default function Home() {
  useRenderCounter('HomePage')
  const { t } = useTranslation()

  const {
    similarArtists,
    recentlyPlayed,
    recentlyAdded,
    genres,
    isGenresLoading,
  } = useHomeDashboardData()
  const latestReleaseQuery = useGetLatestReleaseAlbum()
  const latestReleasedAlbum = latestReleaseQuery.data

  const heroAlbums = useMemo(() => {
    const recommendedAlbums = similarArtists.data?.list || []
    if (!latestReleasedAlbum) return recommendedAlbums

    const dedupedRecommended = recommendedAlbums.filter(
      (album) => album.id !== latestReleasedAlbum.id,
    )

    return [latestReleasedAlbum, ...dedupedRecommended]
  }, [latestReleasedAlbum, similarArtists.data?.list])

  const hasCriticalError =
    similarArtists.isError && recentlyPlayed.isError && recentlyAdded.isError

  if (hasCriticalError) {
    return (
      <PageState
        variant="error"
        title={t('states.error.title')}
        description={t('states.error.homeDescription')}
        actionLabel={t('states.error.retry')}
        onAction={() => {
          Promise.all([
            similarArtists.refetch(),
            recentlyPlayed.refetch(),
            recentlyAdded.refetch(),
          ]).catch(() => undefined)
        }}
      />
    )
  }

  const hasAnyHomeContent =
    (similarArtists.data?.list?.length ?? 0) > 0 ||
    (recentlyPlayed.data?.list?.length ?? 0) > 0 ||
    (recentlyAdded.data?.list?.length ?? 0) > 0 ||
    genres.length > 0

  const allLoaded =
    !similarArtists.isLoading &&
    !recentlyPlayed.isLoading &&
    !recentlyAdded.isLoading &&
    !isGenresLoading
  const showRecentlyAddedFallback =
    (recentlyAdded.isLoading || recentlyAdded.isFetching) &&
    !(recentlyAdded.data?.list?.length ?? 0)
  const showHeaderFallback =
    (similarArtists.isLoading || similarArtists.isFetching) &&
    !(similarArtists.data?.list?.length ?? 0)

  if (allLoaded && !hasAnyHomeContent) {
    return (
      <PageState
        title={t('states.empty.title')}
        description={t('states.empty.homeDescription')}
      />
    )
  }

  return (
    <div className="relative min-h-full w-full overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-52 rounded-full bg-primary/[0.035] blur-3xl" />
      <div className="mx-auto grid w-full max-w-[1380px] min-w-0 gap-5">
        <main className="grid min-w-0 content-start gap-5">
          <section className="h-[249px] min-w-0 min-[1700px]:h-[267px]">
            {showHeaderFallback ? (
              <HeaderFallback />
            ) : (
              <AlbumHeader
                albums={heroAlbums}
                newReleaseAlbumId={latestReleasedAlbum?.id}
                compact
              />
            )}
          </section>

          {/* Primary playlists */}
          <section className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-4 px-1">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">
                  Für dich
                </h2>
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 [&>*]:h-[172px]">
              <DiscoverWeeklyCard />
              <SessionEnergyCard />
            </div>
          </section>

          {/* Secondary playlists */}
          <section className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            {recentlyAdded.data?.list && (
              <RecentAddedColumn albums={recentlyAdded.data.list} />
            )}
            <div className="min-w-0">
              <div className="mb-3 flex items-end justify-between gap-4 px-1">
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">
                    Weitere Vorschläge
                  </h2>
                </div>
              </div>
              <GenreDiscovery
                genres={genres.slice(0, 2)}
                isLoading={isGenresLoading}
                thirdCard={<ThisIsArtist />}
                includeAnniversary
                maxGenres={2}
              />
              {showRecentlyAddedFallback && <PreviewListFallback />}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
