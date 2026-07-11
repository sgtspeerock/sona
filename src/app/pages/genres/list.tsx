import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DetailStickyHeader } from '@/app/components/detail-sticky-header'
import { AlbumsFallback } from '@/app/components/fallbacks/album-fallbacks'
import ListWrapper from '@/app/components/list-wrapper'
import { PageState } from '@/app/components/ui/page-state'
import { ROUTES } from '@/routes/routesList'
import { subsonic } from '@/service/subsonic'
import { Genre } from '@/types/responses/genre'
import { isGenreUsable, normalizeGenreName } from '@/utils/genreNormalization'
import { queryKeys } from '@/utils/queryKeys'

const GRADIENTS = [
  'from-pink-500 to-rose-600',
  'from-purple-600 to-indigo-700',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-violet-600 to-purple-800',
  'from-fuchsia-500 to-pink-600',
  'from-sky-500 to-blue-600',
  'from-green-500 to-emerald-600',
  'from-yellow-500 to-amber-600',
]

function getGenreGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % GRADIENTS.length
  return GRADIENTS[index]
}

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-1">
            {merged.map((genre) => {
              const gradient = getGenreGradient(genre.value)
              return (
                <Link
                  key={genre.value}
                  to={ROUTES.ALBUMS.GENRE(genre.value)}
                  className={`relative overflow-hidden aspect-[4/3] rounded-xl bg-gradient-to-br ${gradient} p-4 text-white shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 group`}
                >
                  {/* Subtle design circles behind */}
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-300" />

                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <h3 className="text-lg font-bold tracking-tight leading-tight break-words capitalize">
                      {genre.value}
                    </h3>
                    <div className="text-xs text-white/80 font-medium">
                      {genre.albumCount > 0 && (
                        <span>
                          {t('genres.albumCount', { count: genre.albumCount })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </ListWrapper>
    </div>
  )
}
