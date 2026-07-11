import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getSimpleCoverArtUrl } from '@/api/httpClient'
import ImageHeader from '@/app/components/album/image-header'
import ArtistTopSongs from '@/app/components/artist/artist-top-songs'
import { ArtistInfo } from '@/app/components/artist/info'
import RelatedArtistsList from '@/app/components/artist/related-artists'
import { AlbumFallback } from '@/app/components/fallbacks/album-fallbacks'
import { PreviewListFallback } from '@/app/components/fallbacks/home-fallbacks'
import { TopSongsTableFallback } from '@/app/components/fallbacks/table-fallbacks'
import { BadgesData } from '@/app/components/header-info'
import PreviewList from '@/app/components/home/preview-list'
import { ImageLoader } from '@/app/components/image-loader'
import ListWrapper from '@/app/components/list-wrapper'
import { Button } from '@/app/components/ui/button'
import { PageState } from '@/app/components/ui/page-state'
import { SonaPanel } from '@/app/components/ui/sona'
import {
  useGetArtist,
  useGetArtistInfo,
  useGetArtists,
  useGetTopSongs,
} from '@/app/hooks/use-artist'
import { useScrollThreshold } from '@/app/hooks/use-scroll-threshold'
import ErrorPage from '@/app/pages/error-page'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routesList'
import { lidarr } from '@/service/lidarr'
import { subsonic } from '@/service/subsonic'
import { useAppIntegrations } from '@/store/app.store'
import { usePlayerActions } from '@/store/player.store'
import { sortRecentAlbums } from '@/utils/album'
import { dedupeAlbumsByIdentity } from '@/utils/albumDedup'

export default function Artist() {
  const { t } = useTranslation()
  const { artistId } = useParams() as { artistId: string }
  const [isLidarrRequesting, setIsLidarrRequesting] = useState(false)
  const showStickyHeader = useScrollThreshold(240)
  const { setSongList } = usePlayerActions()

  const {
    data: artist,
    isLoading: artistIsLoading,
    isFetched,
  } = useGetArtist(artistId)
  const { data: artistsList } = useGetArtists()
  const { data: artistInfo, isLoading: artistInfoIsLoading } =
    useGetArtistInfo(artistId)
  const { data: topSongs, isLoading: topSongsIsLoading } = useGetTopSongs(
    artist?.name,
  )

  const dedupedAlbums = useMemo(
    () => dedupeAlbumsByIdentity(artist?.album ?? []),
    [artist?.album],
  )

  const recentAlbums = useMemo(() => {
    const normalize = (value?: string) =>
      (value ?? '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()

    const sorted = sortRecentAlbums([...dedupedAlbums])
    const byDisplayIdentity = new Map<string, (typeof sorted)[number]>()

    for (const album of sorted) {
      const nameKey = normalize(album.name)
      const coverKey = normalize(album.coverArt)
      const key = nameKey || `cover:${coverKey}` || `id:${album.id}`

      const existing = byDisplayIdentity.get(key)
      if (!existing) {
        byDisplayIdentity.set(key, album)
        continue
      }

      // Keep the richer variant for display
      const existingScore = (existing.songCount ?? 0) + (existing.duration ?? 0)
      const candidateScore = (album.songCount ?? 0) + (album.duration ?? 0)
      if (candidateScore > existingScore) {
        byDisplayIdentity.set(key, album)
      }
    }

    return [...byDisplayIdentity.values()]
  }, [dedupedAlbums])

  const listArtist = useMemo(
    () => artistsList?.find((entry) => entry.id === artistId),
    [artistsList, artistId],
  )

  const { lidarr: lidarrConfig } = useAppIntegrations(
    (state) => state.integrations,
  )
  const isLidarrConfigured = Boolean(lidarrConfig.url && lidarrConfig.apiKey)

  async function handleLidarrArtistRequest() {
    if (!artist?.name || isLidarrRequesting) return

    setIsLidarrRequesting(true)
    try {
      await lidarr.addArtist(artist.name)
      toast.success(t('command.lidarr.success', { artist: artist.name }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Connection failed'
      toast.error(t('command.lidarr.error', { message }))
    } finally {
      setIsLidarrRequesting(false)
    }
  }

  if (artistIsLoading) return <AlbumFallback />
  if (isFetched && !artist) {
    return <ErrorPage status={404} statusText="Not Found" />
  }
  if (!artist) return <AlbumFallback />

  function getSongCount() {
    if (!artist) return null
    if (artist.albumCount === undefined) return null
    if (artist.albumCount === 0) return null
    if (dedupedAlbums.length === 0) return null
    let artistSongCount = 0

    dedupedAlbums.forEach((album) => {
      artistSongCount += album.songCount
    })

    return t('playlist.songCount', { count: artistSongCount })
  }

  function formatAlbumCount() {
    if (!artist) return null
    if (artist.albumCount === undefined) return null
    if (artist.albumCount === 0) return null

    return t('artist.info.albumsCount', { count: dedupedAlbums.length })
  }

  const albumCount = formatAlbumCount()
  const songCount = getSongCount()

  const badges: BadgesData = [
    {
      content: albumCount,
      type: 'link',
      link: ROUTES.ALBUMS.ARTIST(artist.id, artist.name),
    },
    {
      content: songCount,
      type: 'link',
      link: ROUTES.SONGS.ARTIST_TRACKS(artist.id, artist.name),
    },
  ]

  const coverCandidates: Array<{ id?: string; type: 'artist' | 'album' }> = [
    { id: artistInfo?.largeImageUrl, type: 'artist' },
    { id: artistInfo?.mediumImageUrl, type: 'artist' },
    { id: artistInfo?.smallImageUrl, type: 'artist' },
    { id: listArtist?.coverArt, type: listArtist?.coverArtType ?? 'artist' },
    { id: artist.artistImageUrl, type: 'artist' },
    { id: artist.coverArt, type: 'artist' },
  ]

  const isExternalUrl = (value?: string) => /^(https?:)?\/\//i.test(value ?? '')
  const preferredExternal = coverCandidates.find((candidate) =>
    isExternalUrl(candidate.id),
  )
  const preferredInternal = coverCandidates.find(
    (candidate) => Boolean(candidate.id) && !isExternalUrl(candidate.id),
  )

  const preferredCover = preferredExternal ?? preferredInternal
  const headerCoverArt = preferredCover?.id ?? ''
  const headerCoverArtType = preferredCover?.type ?? 'artist'

  if (import.meta.env.DEV) {
    const candidateUrls = coverCandidates.map((candidate, index) => ({
      index,
      id: candidate.id ?? '',
      type: candidate.type,
    }))
    console.info('[ArtistPage] cover source decision', {
      artistId,
      selected: preferredCover,
      candidates: candidateUrls,
    })
    console.info('[ArtistPage] artistInfo image urls', {
      artistId,
      large: artistInfo?.largeImageUrl ?? '',
      medium: artistInfo?.mediumImageUrl ?? '',
      small: artistInfo?.smallImageUrl ?? '',
      artistImageUrl: artist.artistImageUrl ?? '',
      artistCoverArt: artist.coverArt ?? '',
      listCoverArt: listArtist?.coverArt ?? '',
    })
  }

  const playArtist = async () => {
    if (topSongs && topSongs.length > 0) {
      setSongList(topSongs, 0)
    } else {
      const songs = await subsonic.artists.getArtistSongs(artistId)
      if (songs && songs.length > 0) {
        setSongList(songs, 0)
      }
    }
  }

  return (
    <div className="w-full relative">
      {/* Compact Sticky Header on Scroll */}
      <div
        className={cn(
          'sticky top-0 left-0 right-0 z-30 h-14 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-8 transition-all duration-300 transform-gpu',
          showStickyHeader
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none absolute',
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ImageLoader id={headerCoverArt} type={headerCoverArtType} size="80">
            {(src) => {
              const fallbackSrc = getSimpleCoverArtUrl(
                undefined,
                headerCoverArtType,
                '80',
              )
              return (
                <img
                  src={src || fallbackSrc}
                  alt={artist.name}
                  className="w-9 h-9 rounded-full object-cover border border-border/30"
                />
              )
            }}
          </ImageLoader>
          <div className="min-w-0 flex flex-col justify-center">
            <h2 className="text-sm font-bold truncate leading-tight">
              {artist.name}
            </h2>
          </div>
          {((topSongs && topSongs.length > 0) ||
            (dedupedAlbums && dedupedAlbums.length > 0)) && (
            <Button
              size="sm"
              onClick={playArtist}
              className="h-8 rounded-full px-4 text-xs font-semibold shrink-0 ml-2"
            >
              {t('options.play', 'Play')}
            </Button>
          )}
        </div>
      </div>

      <ImageHeader
        type={t('artist.headline')}
        title={artist.name}
        coverArtId={headerCoverArt}
        coverArtType={headerCoverArtType}
        coverArtSize="700"
        coverArtAlt={artist.name}
        badges={badges}
        variant="artist"
      />

      <ListWrapper className="space-y-6">
        <SonaPanel className="p-5">
          <ArtistInfo artist={artist} />

          {topSongsIsLoading && <TopSongsTableFallback />}
          {topSongs && !topSongsIsLoading && (
            <ArtistTopSongs topSongs={topSongs} artist={artist} />
          )}
          {!topSongsIsLoading &&
            (topSongs?.length ?? 0) === 0 &&
            recentAlbums.length === 0 && (
              <PageState
                title={t('states.empty.title')}
                description={t('states.empty.artistDescription')}
                className="min-h-[180px] px-0 py-4"
                actionLabel={
                  isLidarrConfigured
                    ? isLidarrRequesting
                      ? t('command.lidarr.requesting')
                      : t('command.lidarr.request', { artist: artist.name })
                    : undefined
                }
                onAction={
                  isLidarrConfigured ? handleLidarrArtistRequest : undefined
                }
              />
            )}
        </SonaPanel>

        {recentAlbums.length > 0 && (
          <section className="px-1 pt-1">
            <PreviewList
              title={t('artist.recentAlbums')}
              list={recentAlbums}
              moreTitle={t('album.more.discography')}
              moreRoute={ROUTES.ALBUMS.ARTIST(artist.id, artist.name)}
              showAlbumYearInSubtitle
            />
          </section>
        )}

        {artistInfoIsLoading && <PreviewListFallback />}
        {artistInfo?.similarArtist && !artistInfoIsLoading && (
          <section className="px-1 pt-1">
            <RelatedArtistsList
              title={t('artist.relatedArtists')}
              similarArtists={artistInfo.similarArtist}
            />
          </section>
        )}
      </ListWrapper>
    </div>
  )
}
