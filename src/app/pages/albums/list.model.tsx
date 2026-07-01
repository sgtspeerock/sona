import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  albumSearch,
  getAlbumList,
  getArtistDiscography,
} from '@/queries/albums'
import { AlbumListType } from '@/types/responses/album'
import { dedupeAlbumsForDisplay } from '@/utils/albumDedup'
import {
  AlbumsFilters,
  AlbumsSearchParams,
  YearFilter,
  YearSortOptions,
} from '@/utils/albumsFilter'
import { queryKeys } from '@/utils/queryKeys'
import { scrollPageToTop } from '@/utils/scrollPageToTop'
import { SearchParamsHandler } from '@/utils/searchParamsHandler'

const ALBUMS_PAGE_SIZE = 48

export function useAlbumsListModel() {
  const [searchParams] = useSearchParams()
  const { getSearchParam } = new SearchParamsHandler(searchParams)
  const [pageIndex, setPageIndex] = useState(0)
  const oldestYear = '0001'
  const currentYear = new Date().getFullYear().toString()

  const currentFilter = getSearchParam<AlbumListType>(
    AlbumsSearchParams.MainFilter,
    AlbumsFilters.RecentlyAdded,
  )
  const yearFilter = getSearchParam<YearFilter>(
    AlbumsSearchParams.YearFilter,
    YearSortOptions.Oldest,
  )
  const genre = getSearchParam<string>(AlbumsSearchParams.Genre, '')
  const artistId = getSearchParam<string>(AlbumsSearchParams.ArtistId, '')
  const query = getSearchParam<string>(AlbumsSearchParams.Query, '')

  useEffect(() => {
    setPageIndex(0)
    requestAnimationFrame(() => {
      scrollPageToTop()
    })
  }, [artistId, currentFilter, genre, query, yearFilter])

  function getYearRange() {
    if (yearFilter === YearSortOptions.Oldest) {
      return [oldestYear, currentYear]
    } else {
      return [currentYear, oldestYear]
    }
  }

  const [fromYear, toYear] = getYearRange()

  const fetchAlbums = async () => {
    const offset = pageIndex * ALBUMS_PAGE_SIZE

    if (artistId !== '') {
      return getArtistDiscography(artistId)
    }

    if (currentFilter === AlbumsFilters.Search && query !== '') {
      return albumSearch({
        query,
        count: ALBUMS_PAGE_SIZE,
        offset,
      })
    }

    return getAlbumList({
      type: currentFilter,
      size: ALBUMS_PAGE_SIZE,
      offset,
      fromYear,
      toYear,
      genre,
    })
  }

  function enableMainQuery() {
    if (currentFilter === AlbumsFilters.ByGenre && genre === '') return false

    return true
  }

  const { data, isLoading } = useQuery({
    queryKey: [
      queryKeys.album.all,
      currentFilter,
      yearFilter,
      genre,
      query,
      artistId,
      pageIndex,
    ],
    queryFn: fetchAlbums,
    enabled: enableMainQuery(),
  })

  function getAlbums() {
    if (!data) return { albums: [], albumsCount: 0 }

    let albums = dedupeAlbumsForDisplay(data.albums)

    // Extra-hard dedupe for artist discography pages. This removes mirrored
    // duplicates that still leak through inconsistent server ids/metadata.
    if (artistId !== '') {
      const normalize = (value?: string) =>
        (value ?? '')
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim()

      const byName = new Map<string, (typeof albums)[number]>()
      for (const album of albums) {
        const key = normalize(album.name)
        const existing = byName.get(key)
        if (!existing) {
          byName.set(key, album)
          continue
        }

        const existingScore =
          (existing.songCount ?? 0) + (existing.duration ?? 0)
        const currentScore = (album.songCount ?? 0) + (album.duration ?? 0)
        if (currentScore > existingScore) {
          byName.set(key, album)
        }
      }
      albums = [...byName.values()]
    }

    return {
      albums,
      albumsCount: data.albumsCount,
    }
  }

  const { albums, albumsCount } = getAlbums()
  const pageCount = Math.max(1, Math.ceil(albumsCount / ALBUMS_PAGE_SIZE))

  const isEmpty = albums.length === 0 || !data

  return {
    isLoading,
    isEmpty,
    albums,
    albumsCount,
    pageCount,
    pageIndex,
    pageSize: ALBUMS_PAGE_SIZE,
    setPageIndex,
  }
}
