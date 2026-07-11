import { useQuery } from '@tanstack/react-query'
import { SearchIcon, XIcon } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShadowHeader } from '@/app/components/album/shadow-header'
import { ArtistGridCard } from '@/app/components/artist/artist-grid-card'
import { ArtistsFallback } from '@/app/components/fallbacks/artists.tsx'
import { GridViewWrapper } from '@/app/components/grid-view-wrapper'
import { HeaderTitle } from '@/app/components/header-title'
import ListWrapper from '@/app/components/list-wrapper'
import { MainViewTypeSelector } from '@/app/components/main-grid'
import { Button } from '@/app/components/ui/button'
import { DataTable } from '@/app/components/ui/data-table'
import { Input } from '@/app/components/ui/input'
import { PageState } from '@/app/components/ui/page-state'
import { useSongList } from '@/app/hooks/use-song-list'
import { artistsColumns } from '@/app/tables/artists-columns'
import { subsonic } from '@/service/subsonic'
import { useAppArtistsViewType } from '@/store/app.store'
import { usePlayerActions } from '@/store/player.store'
import { ISimilarArtist } from '@/types/responses/artist'
import { queryKeys } from '@/utils/queryKeys'

const MemoShadowHeader = memo(ShadowHeader)
const MemoHeaderTitle = memo(HeaderTitle)
const MemoViewTypeSelector = memo(MainViewTypeSelector)
const MemoDataTable = memo(DataTable) as typeof DataTable
const MemoListWrapper = memo(ListWrapper)

export default function ArtistsList() {
  const { t } = useTranslation()
  const [artistSearch, setArtistSearch] = useState('')
  const { getArtistAllSongs } = useSongList()
  const { setSongList } = usePlayerActions()
  const {
    artistsPageViewType,
    setArtistsPageViewType,
    isTableView,
    isGridView,
  } = useAppArtistsViewType()

  const columns = artistsColumns()

  const {
    data: artists,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [queryKeys.artist.all],
    queryFn: subsonic.artists.getAll,
  })

  async function handlePlayArtistRadio(artist: ISimilarArtist) {
    const songList = await getArtistAllSongs(artist.name)

    if (songList) setSongList(songList, 0)
  }

  const filteredArtists = useMemo(() => {
    if (!artists) return []

    const query = artistSearch.trim().toLowerCase()
    if (!query) return artists

    return artists.filter((artist) => artist.name.toLowerCase().includes(query))
  }, [artistSearch, artists])

  if (isLoading) return <ArtistsFallback />
  if (isError) {
    return (
      <PageState
        variant="error"
        title={t('states.error.title')}
        description={t('states.error.description', {
          status: 500,
          detail: t('generic.error'),
        })}
        actionLabel={t('states.error.retry')}
        onAction={() => {
          refetch().catch(() => undefined)
        }}
      />
    )
  }
  if (!artists || artists.length === 0) {
    return (
      <PageState
        title={t('states.empty.title')}
        description={t('states.empty.noResults')}
      />
    )
  }

  return (
    <div className="w-full h-full">
      <MemoShadowHeader>
        <div className="flex w-full items-center justify-between gap-4">
          <MemoHeaderTitle
            title={t('sidebar.artists')}
            count={filteredArtists.length}
          />

          <div className="flex flex-1 items-center justify-end gap-2">
            <div className="relative h-9 w-[260px]">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={artistSearch}
                onChange={(event) => setArtistSearch(event.target.value)}
                placeholder={t('sidebar.search')}
                className="h-9 rounded-[var(--radius-control)] bg-background pl-9 pr-9"
                autoCorrect="false"
                autoCapitalize="false"
                spellCheck="false"
              />
              {artistSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 size-6 -translate-y-1/2 rounded-[var(--radius-control)]"
                  onClick={() => setArtistSearch('')}
                >
                  <XIcon className="size-4" />
                </Button>
              )}
            </div>

            <MemoViewTypeSelector
              viewType={artistsPageViewType}
              setViewType={setArtistsPageViewType}
            />
          </div>
        </div>
      </MemoShadowHeader>

      {isTableView && (
        <MemoListWrapper>
          <MemoDataTable
            columns={columns}
            data={filteredArtists}
            showPagination={true}
            paginationPageSizeOptions={[20, 50, 100]}
            initialPageSize={20}
            handlePlaySong={(row) => handlePlayArtistRadio(row.original)}
            allowRowSelection={false}
            dataType="artist"
          />
        </MemoListWrapper>
      )}

      {isGridView && (
        <MemoListWrapper className="px-0">
          <GridViewWrapper
            list={filteredArtists}
            data-testid="artists-grid"
            type="artists"
          >
            {(artist) => <ArtistGridCard artist={artist} />}
          </GridViewWrapper>
        </MemoListWrapper>
      )}
    </div>
  )
}
