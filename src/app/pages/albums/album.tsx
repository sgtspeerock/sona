import { startTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { getSimpleCoverArtUrl } from '@/api/httpClient'
import ImageHeader from '@/app/components/album/image-header'
import { AlbumInfo } from '@/app/components/album/info'
import { RecordLabelsInfo } from '@/app/components/album/record-labels'
import { AlbumFallback } from '@/app/components/fallbacks/album-fallbacks'
import { PreviewListFallback } from '@/app/components/fallbacks/home-fallbacks'
import { BadgesData } from '@/app/components/header-info'
import PreviewList from '@/app/components/home/preview-list'
import { ImageLoader } from '@/app/components/image-loader'
import ListWrapper from '@/app/components/list-wrapper'
import { Button } from '@/app/components/ui/button'
import { DataTable } from '@/app/components/ui/data-table'
import { PageState } from '@/app/components/ui/page-state'
import { SonaPanel } from '@/app/components/ui/sona'
import {
  useGetAlbum,
  useGetArtistAlbums,
  useGetGenreAlbums,
} from '@/app/hooks/use-album'
import { useScrollThreshold } from '@/app/hooks/use-scroll-threshold'
import ErrorPage from '@/app/pages/error-page'
import { songsColumns } from '@/app/tables/songs-columns'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routesList'
import { usePlayerActions } from '@/store/player.store'
import { ColumnFilter } from '@/types/columnFilter'
import { Albums } from '@/types/responses/album'
import { sortRecentAlbums } from '@/utils/album'
import { convertSecondsToHumanRead } from '@/utils/convertSecondsToTime'

export default function Album() {
  const { albumId: albumIdParam } = useParams() as { albumId: string }
  const [searchParams] = useSearchParams()
  const albumId = decodeURIComponent(albumIdParam ?? '')
  const highlightSongId = searchParams.get('songId') ?? undefined
  const { setSongList } = usePlayerActions()
  const { t } = useTranslation()

  const showStickyHeader = useScrollThreshold(240)
  const {
    data: album,
    isLoading: albumIsLoading,
    isFetched,
  } = useGetAlbum(albumId)
  const { data: artist, isLoading: moreAlbumsIsLoading } = useGetArtistAlbums(
    album?.artistId || '',
  )
  const { data: randomAlbums, isLoading: randomAlbumsIsLoading } =
    useGetGenreAlbums(album?.genre || '')

  const moreAlbums = artist?.album

  if (albumIsLoading) return <AlbumFallback />
  if (isFetched && !album) {
    return <ErrorPage status={404} statusText="Not Found" />
  }
  if (!album) return <AlbumFallback />

  const columns = songsColumns()

  const albumDuration = album.duration
    ? convertSecondsToHumanRead(album.duration)
    : null

  const badges: BadgesData = [
    { content: album.year?.toString() ?? null, type: 'text' },
    {
      content: album.genre ?? null,
      type: 'link',
      link: ROUTES.ALBUMS.GENRE(album.genre),
    },
    {
      content: album.songCount
        ? t('playlist.songCount', { count: album.songCount })
        : null,
      type: 'text',
    },
    {
      content: albumDuration
        ? t('playlist.duration', { duration: albumDuration })
        : null,
      type: 'text',
    },
  ]

  const columnsToShow: ColumnFilter[] = [
    'trackNumber',
    'title',
    'duration',
    'select',
  ]

  function removeCurrentAlbumFromList(moreAlbums: Albums[], sort = false) {
    if (moreAlbums.length === 0 || !album) return null

    let list = moreAlbums.filter((item) => item.id !== album.id)

    if (sort) {
      list = sortRecentAlbums(list)
    }

    if (list.length > 16) list = list.slice(0, 16)

    if (list.length === 0) return null

    return list
  }

  const artistAlbums = moreAlbums
    ? removeCurrentAlbumFromList(moreAlbums, true)
    : null

  const randomGenreAlbums =
    randomAlbums?.list && album.genre
      ? removeCurrentAlbumFromList(randomAlbums.list)
      : null

  const albumSongs = album.song.map((song) => ({
    ...song,
    coverArt: song.coverArt || album.coverArt,
  }))

  const playAlbumFromIndex = (index: number) => {
    startTransition(() => {
      setSongList(albumSongs, index)
    })
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
          <ImageLoader id={album.coverArt} type="album" size="80">
            {(src) => {
              const fallbackSrc = getSimpleCoverArtUrl(undefined, 'album', '80')
              return (
                <img
                  src={src || fallbackSrc}
                  alt={album.name}
                  className="w-9 h-9 rounded-md object-cover border border-border/30"
                />
              )
            }}
          </ImageLoader>
          <div className="min-w-0 flex flex-col justify-center">
            <h2 className="text-sm font-bold truncate leading-tight">
              {album.name}
            </h2>
            <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              {album.artist}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => playAlbumFromIndex(0)}
            className="h-8 rounded-full px-4 text-xs font-semibold shrink-0 ml-2"
          >
            {t('options.play', 'Play')}
          </Button>
        </div>
      </div>

      <ImageHeader
        type={t('album.headline')}
        title={album.name}
        subtitle={album.artist}
        artistId={album.artistId}
        artists={album.artists}
        coverArtId={album.coverArt}
        coverArtType="album"
        coverArtSize="700"
        coverArtAlt={album.name}
        badges={badges}
      />

      <ListWrapper className="space-y-6">
        <SonaPanel className="p-5">
          <AlbumInfo album={album} />

          <DataTable
            columns={columns}
            data={albumSongs}
            handlePlaySong={(row) => playAlbumFromIndex(row.index)}
            columnFilter={columnsToShow}
            noRowsMessage={t('states.empty.noTracks')}
            showDiscNumber={true}
            variant="modern"
            highlightRowId={highlightSongId}
          />

          {albumSongs.length === 0 && (
            <PageState
              title={t('states.empty.title')}
              description={t('states.empty.albumDescription')}
              className="min-h-[160px] px-0 py-2"
            />
          )}

          <RecordLabelsInfo album={album} />
        </SonaPanel>

        <div className="space-y-6">
          {moreAlbumsIsLoading && <PreviewListFallback />}
          {artistAlbums && !moreAlbumsIsLoading && album.artistId && (
            <section className="px-1 pt-1">
              <PreviewList
                list={artistAlbums}
                showMore={true}
                title={t('album.more.listTitle')}
                moreTitle={t('album.more.discography')}
                moreRoute={ROUTES.ALBUMS.ARTIST(album.artistId, album.artist)}
                showAlbumYearInSubtitle
              />
            </section>
          )}

          {randomAlbumsIsLoading && <PreviewListFallback />}
          {!randomAlbumsIsLoading && randomGenreAlbums && (
            <section className="px-1 pt-1">
              <PreviewList
                list={randomGenreAlbums}
                moreRoute={ROUTES.ALBUMS.GENRE(album.genre)}
                title={t('album.more.genreTitle', {
                  genre: album.genre,
                })}
                compact
              />
            </section>
          )}
        </div>
      </ListWrapper>
    </div>
  )
}
