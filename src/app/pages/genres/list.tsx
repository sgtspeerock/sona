import { useQuery } from '@tanstack/react-query'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DetailStickyHeader } from '@/app/components/detail-sticky-header'
import { AlbumsFallback } from '@/app/components/fallbacks/album-fallbacks'
import ListWrapper from '@/app/components/list-wrapper'
import { DataTable } from '@/app/components/ui/data-table'
import { PageState } from '@/app/components/ui/page-state'
import { genresColumns } from '@/app/tables/genres-columns'
import { subsonic } from '@/service/subsonic'
import { Genre } from '@/types/responses/genre'
import { isGenreUsable, normalizeGenreName } from '@/utils/genreNormalization'
import { queryKeys } from '@/utils/queryKeys'

const MemoDataTable = memo(DataTable) as typeof DataTable

export default function GenresList() {
  const { t } = useTranslation()

  const { data: genres, isLoading } = useQuery({
    queryKey: [queryKeys.genre.all],
    queryFn: subsonic.genres.get,
  })

  const merged = useMemo<Genre[]>(() => {
    if (!genres) return []

    const map = new Map<string, Genre>()

    for (const genre of genres) {
      if (!isGenreUsable(genre.value)) continue

      const canonical = normalizeGenreName(genre.value)
      const existing = map.get(canonical)

      if (existing) {
        map.set(canonical, {
          value: canonical,
          albumCount: existing.albumCount + genre.albumCount,
          songCount: existing.songCount + genre.songCount,
        })
      } else {
        map.set(canonical, {
          value: canonical,
          albumCount: genre.albumCount,
          songCount: genre.songCount,
        })
      }
    }

    return [...map.values()].sort((a, b) => a.value.localeCompare(b.value))
  }, [genres])

  if (isLoading) return <AlbumsFallback />

  const columns = genresColumns()

  return (
    <div className="w-full h-full">
      <DetailStickyHeader
        title={t('sidebar.genres', 'Genres')}
        count={merged.length}
      />

      <ListWrapper>
        {merged.length === 0 ? (
          <PageState
            title={t('states.empty.title')}
            description={t('states.empty.noResults')}
            className="min-h-[260px]"
          />
        ) : (
          <MemoDataTable
            columns={columns}
            data={merged}
            allowRowSelection={false}
            showContextMenu={false}
            showSearch={true}
            searchColumn="value"
            dataType="artist"
          />
        )}
      </ListWrapper>
    </div>
  )
}
