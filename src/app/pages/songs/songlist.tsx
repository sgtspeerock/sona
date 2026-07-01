import { useQuery } from '@tanstack/react-query'
import { Shuffle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { DetailStickyHeader } from '@/app/components/detail-sticky-header'
import { InfinitySongListFallback } from '@/app/components/fallbacks/song-fallbacks'
import { ClearFilterButton } from '@/app/components/search/clear-filter-button'
import { ExpandableSearchInput } from '@/app/components/search/expandable-input'
import { Button } from '@/app/components/ui/button'
import { DataTable } from '@/app/components/ui/data-table'
import { LibraryPagination } from '@/app/components/ui/library-pagination'
import { useTotalSongs } from '@/app/hooks/use-total-songs'
import { songsColumns } from '@/app/tables/songs-columns'
import { getArtistAllSongs, songsSearch } from '@/queries/songs'
import { usePlayerActions } from '@/store/player.store'
import { ColumnFilter } from '@/types/columnFilter'
import { AlbumsFilters, AlbumsSearchParams } from '@/utils/albumsFilter'
import { queryKeys } from '@/utils/queryKeys'
import { scrollPageToTop } from '@/utils/scrollPageToTop'
import { SearchParamsHandler } from '@/utils/searchParamsHandler'

const SONGS_PAGE_SIZE = 50

export default function SongList() {
  const { t } = useTranslation()
  const { setSongList, startRuntimeShuffleAll } = usePlayerActions()
  const [isShuffling, setIsShuffling] = useState(false)
  const [searchParams] = useSearchParams()
  const { getSearchParam } = new SearchParamsHandler(searchParams)
  const columns = songsColumns()
  const [pageIndex, setPageIndex] = useState(0)

  const filter = getSearchParam<string>(AlbumsSearchParams.MainFilter, '')
  const query = getSearchParam<string>(AlbumsSearchParams.Query, '')
  const selectedSongId = getSearchParam<string>(AlbumsSearchParams.SongId, '')
  const artistId = getSearchParam<string>(AlbumsSearchParams.ArtistId, '')
  const artistName = getSearchParam<string>(AlbumsSearchParams.ArtistName, '')

  const searchFilterIsSet = filter === AlbumsFilters.Search && query !== ''
  const filterByArtist = artistId !== '' && artistName !== ''

  useEffect(() => {
    setPageIndex(0)
    requestAnimationFrame(() => scrollPageToTop())
  }, [artistId, filter, query])

  async function fetchSongs() {
    if (filterByArtist) {
      return getArtistAllSongs(artistId)
    }

    return songsSearch({
      query: searchFilterIsSet ? query : '',
      songCount: SONGS_PAGE_SIZE,
      songOffset: pageIndex * SONGS_PAGE_SIZE,
    })
  }

  const { data, isLoading } = useQuery({
    queryKey: [queryKeys.song.all, filter, query, artistId, pageIndex],
    queryFn: fetchSongs,
  })

  const { data: songCountData, isLoading: songCountIsLoading } = useTotalSongs()

  if (isLoading) {
    return <InfinitySongListFallback />
  }
  if (!data) return null

  const allSongs = data.songs ?? []
  const artistPageOffset = pageIndex * SONGS_PAGE_SIZE
  const songlist = filterByArtist
    ? allSongs.slice(artistPageOffset, artistPageOffset + SONGS_PAGE_SIZE)
    : allSongs
  const songCount = filterByArtist
    ? (data.songs?.length ?? 0)
    : searchFilterIsSet
      ? pageIndex * SONGS_PAGE_SIZE + songlist.length + (data.nextOffset ? 1 : 0)
      : (songCountData ?? 0)
  const pageCount = searchFilterIsSet
    ? pageIndex + (data.nextOffset ? 2 : 1)
    : Math.max(1, Math.ceil(songCount / SONGS_PAGE_SIZE))

  function handlePlaySong(index: number) {
    if (songlist) setSongList(songlist, index)
  }

  async function handleShuffleAll() {
    if (isShuffling) return
    setIsShuffling(true)
    try {
      await startRuntimeShuffleAll()
    } finally {
      setIsShuffling(false)
    }
  }

  const columnsToShow: ColumnFilter[] = [
    'index',
    'title',
    // 'artist',
    'album',
    'duration',
    'playCount',
    'played',
    'contentType',
    'select',
  ]

  const title = filterByArtist
    ? t('songs.list.byArtist', { artist: artistName })
    : t('sidebar.songs')

  return (
    <div className="flex h-content w-full flex-col">
      <DetailStickyHeader
        title={title}
        count={songCount}
        loading={songCountIsLoading}
        fixed={false}
        showGlassEffect={false}
        rightSlot={
          <>
          <Button
            variant="outline"
            size="sm"
            className="text-green-500 hover:text-green-400 border-green-500/30 hover:border-green-500/60"
            onClick={handleShuffleAll}
            disabled={isShuffling}
          >
            <Shuffle className="w-4 h-4 mr-2" />
            {t('songs.list.shuffleAll')}
          </Button>

          {filterByArtist && <ClearFilterButton />}
          <ExpandableSearchInput
            placeholder={t('songs.list.search.placeholder')}
          />
          </>
        }
      />

      <div className="flex flex-1 flex-col px-8 pb-8">
        <div>
          <DataTable
            columns={columns}
            data={songlist}
            handlePlaySong={(row) => handlePlaySong(row.index)}
            columnFilter={columnsToShow}
            showPagination={false}
            variant="modern"
            dataType="song"
            highlightRowId={selectedSongId || undefined}
          />
        </div>
        <LibraryPagination
          pageIndex={pageIndex}
          pageCount={pageCount}
          itemCount={searchFilterIsSet ? undefined : songCount}
          pageSize={SONGS_PAGE_SIZE}
          visibleCount={songlist.length}
          canNextPage={Boolean(data.nextOffset) || pageIndex < pageCount - 1}
          onFirstPage={() => setPageIndex(0)}
          onPreviousPage={() => setPageIndex(Math.max(0, pageIndex - 1))}
          onNextPage={() => setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
          onLastPage={() => setPageIndex(pageCount - 1)}
        />
      </div>
    </div>
  )
}
