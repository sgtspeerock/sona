import { useQueries, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { subsonic } from '@/service/subsonic'
import { Albums, AlbumsListData } from '@/types/responses/album'
import { Genres } from '@/types/responses/genre'
import type { ISong } from '@/types/responses/song'
import { convertMinutesToMs } from '@/utils/convertSecondsToTime'
import { logger } from '@/utils/logger'
import { queryKeys } from '@/utils/queryKeys'

const HOME_QUERY_BASE = {
  staleTime: convertMinutesToMs(10),
  gcTime: convertMinutesToMs(30),
  refetchOnWindowFocus: false as const,
}

function createHomeAlbumListQuery(
  key: string,
  type: 'newest' | 'frequent' | 'recent' | 'random',
  size = 16,
) {
  return {
    queryKey: [key],
    queryFn: () =>
      subsonic.albums.getAlbumList({
        size,
        type,
      }),
  }
}
function parseReleaseLikeDate(value: unknown): number | undefined {
  if (!value) return undefined

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = Date.parse(String(value))
    if (Number.isFinite(parsed)) return parsed
    const asNumber = Number(value)
    return Number.isFinite(asNumber) ? asNumber : undefined
  }

  if (typeof value === 'object') {
    const maybeDate = value as {
      year?: number
      month?: number
      day?: number
      date?: string
    }

    if (typeof maybeDate.date === 'string') {
      const parsed = Date.parse(maybeDate.date)
      if (Number.isFinite(parsed)) return parsed
    }

    if (typeof maybeDate.year === 'number' && Number.isFinite(maybeDate.year)) {
      const monthIndex =
        typeof maybeDate.month === 'number' && Number.isFinite(maybeDate.month)
          ? Math.max(0, maybeDate.month - 1)
          : 0
      const day =
        typeof maybeDate.day === 'number' && Number.isFinite(maybeDate.day)
          ? Math.max(1, maybeDate.day)
          : 1
      return Date.UTC(maybeDate.year, monthIndex, day)
    }
  }

  return undefined
}

function getAlbumReleaseTimestamp(album: Albums): number {
  const fromReleaseDate = parseReleaseLikeDate(album.releaseDate)
  if (typeof fromReleaseDate === 'number') return fromReleaseDate

  const fromOriginalReleaseDate = parseReleaseLikeDate(
    album.originalReleaseDate,
  )
  if (typeof fromOriginalReleaseDate === 'number')
    return fromOriginalReleaseDate

  if (typeof album.year === 'number' && Number.isFinite(album.year)) {
    return Date.UTC(album.year, 0, 1)
  }

  const fromCreated = parseReleaseLikeDate(album.created)
  if (typeof fromCreated === 'number') return fromCreated

  return 0
}
export interface GenreDiscoveryItem {
  value: string
  albumCount: number
}

export interface AnniversaryRadioData {
  album?: Albums
  yearsAgo?: number
}

export interface SessionEnergyData {
  songs: ISong[]
  genre?: string
  artist?: string
}

function deriveGenreDiscoveryItems(
  genres?: Genres,
  mostPlayed?: AlbumsListData,
): GenreDiscoveryItem[] {
  const topGenres = (() => {
    if (!mostPlayed?.list) return []
    const genreCounts = new Map<string, number>()
    mostPlayed.list.forEach((album) => {
      if (!album.genre) return
      genreCounts.set(album.genre, (genreCounts.get(album.genre) || 0) + 1)
    })
    return Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre)
  })()

  const selectedGenres = (() => {
    if (topGenres.length > 0) return topGenres
    if (!genres || genres.length === 0) return []
    return [...genres]
      .sort((a, b) => (b.songCount || 0) - (a.songCount || 0))
      .slice(0, 3)
      .map((genre) => genre.value)
  })()

  if (selectedGenres.length === 0) return []

  const genresMap = new Map((genres || []).map((genre) => [genre.value, genre]))
  return selectedGenres.map((genreValue) => ({
    value: genreValue,
    albumCount: genresMap.get(genreValue)?.albumCount ?? 0,
  }))
}

export const useGetRandomSongs = () => {
  return useQuery({
    queryKey: [queryKeys.song.random],
    queryFn: () => subsonic.songs.getRandomSongs({ size: 10 }),
    ...HOME_QUERY_BASE,
  })
}

export const useGetRecentlyAdded = () => {
  return useQuery({
    ...createHomeAlbumListQuery(queryKeys.album.recentlyAdded, 'newest'),
    ...HOME_QUERY_BASE,
  })
}

export const useGetLatestReleaseAlbum = () => {
  return useQuery({
    queryKey: [queryKeys.album.latestRelease],
    queryFn: async () => {
      const currentYear = new Date().getUTCFullYear()

      // Probe recent release windows first so "New Release" does not get
      // polluted by old catalog entries that were recently added/scanned.
      const yearWindows = [
        1, // current year
        2, // current + previous
        4,
        8,
        16,
      ]

      for (const span of yearWindows) {
        const fromYear = currentYear - span + 1
        const byYear = await subsonic.albums.getAlbumList({
          type: 'byYear',
          fromYear: String(fromYear),
          toYear: String(currentYear),
          size: 200,
        })

        const byYearList = byYear?.list || []
        if (!byYearList.length) continue

        return [...byYearList].sort(
          (a, b) => getAlbumReleaseTimestamp(b) - getAlbumReleaseTimestamp(a),
        )[0]
      }

      const fallbackNewest = await subsonic.albums.getAlbumList({
        type: 'newest',
        size: 200,
      })
      const fallbackList = fallbackNewest?.list || []
      if (!fallbackList.length) return undefined

      return [...fallbackList].sort(
        (a, b) => getAlbumReleaseTimestamp(b) - getAlbumReleaseTimestamp(a),
      )[0]
    },
    ...HOME_QUERY_BASE,
  })
}

export const useGetAnniversaryRadio = () => {
  return useQuery({
    queryKey: ['home-release-anniversary'],
    queryFn: async (): Promise<AnniversaryRadioData> => {
      const anniversary = await getAnniversaryAlbumFallback()
      return {
        album: anniversary?.album,
        yearsAgo: anniversary?.yearsAgo,
      }
    },
    staleTime: convertMinutesToMs(60),
    gcTime: convertMinutesToMs(120),
    refetchOnWindowFocus: false,
  })
}

export const useGetSessionEnergy = () => {
  const { data: recentlyPlayed } = useGetRecentlyPlayed()
  const { data: mostPlayed } = useGetMostPlayed()

  const profile = useMemo(() => {
    const recentAlbums = recentlyPlayed?.list ?? []
    const fallbackAlbums = mostPlayed?.list ?? []
    const sourceAlbums = recentAlbums.length > 0 ? recentAlbums : fallbackAlbums
    const genreCounts = new Map<string, number>()
    const artistCounts = new Map<string, number>()

    sourceAlbums.slice(0, 12).forEach((album, index) => {
      const weight = Math.max(1, 12 - index)
      if (album.genre) {
        genreCounts.set(
          album.genre,
          (genreCounts.get(album.genre) ?? 0) + weight,
        )
      }
      if (album.artist) {
        artistCounts.set(
          album.artist,
          (artistCounts.get(album.artist) ?? 0) + weight,
        )
      }
    })

    const genre = Array.from(genreCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0]
    const artist = Array.from(artistCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0]

    return { genre, artist }
  }, [mostPlayed?.list, recentlyPlayed?.list])

  return useQuery({
    queryKey: [queryKeys.song.sessionEnergy, profile.genre, profile.artist],
    queryFn: async (): Promise<SessionEnergyData> => {
      const songs =
        (await subsonic.songs.getRandomSongs({
          size: 40,
          genre: profile.genre,
        })) ?? []

      if (songs.length > 0) {
        return {
          songs,
          genre: profile.genre,
          artist: profile.artist,
        }
      }

      return {
        songs: (await subsonic.songs.getRandomSongs({ size: 40 })) ?? [],
        genre: profile.genre,
        artist: profile.artist,
      }
    },
    enabled: Boolean(recentlyPlayed || mostPlayed),
    staleTime: convertMinutesToMs(8),
    gcTime: convertMinutesToMs(30),
    refetchOnWindowFocus: false,
  })
}

async function getAnniversaryAlbumFallback() {
  const now = new Date()
  const candidateYears = [
    ...Array.from({ length: 30 }, (_, i) => i + 1),
    35,
    40,
    45,
    50,
  ]

  const results = await Promise.all(
    candidateYears.map(async (yearsAgo) => {
      const releaseYear = now.getUTCFullYear() - yearsAgo
      try {
        const albums = await subsonic.albums.getAlbumList({
          type: 'byYear',
          fromYear: String(releaseYear),
          toYear: String(releaseYear),
          size: 200,
        })
        const candidates = albums?.list || []
        if (candidates.length === 0) return null

        const exactishDate = candidates.find((album) =>
          isAlbumNearToday(album, now),
        )

        if (exactishDate) {
          return { album: exactishDate, yearsAgo, exact: true }
        }
        return { album: candidates[0], yearsAgo, exact: false }
      } catch {
        return null
      }
    }),
  )

  const validResults = results.filter(
    (r): r is { album: any; yearsAgo: number; exact: boolean } => r !== null,
  )

  const exactMatch = validResults.find((r) => r.exact)
  if (exactMatch) {
    return {
      album: exactMatch.album,
      yearsAgo: exactMatch.yearsAgo,
    }
  }

  if (validResults.length > 0) {
    return {
      album: validResults[0].album,
      yearsAgo: validResults[0].yearsAgo,
    }
  }

  return undefined
}

function isAlbumNearToday(album: Albums, now: Date) {
  const timestamp =
    parseReleaseLikeDate(album.releaseDate) ??
    parseReleaseLikeDate(album.originalReleaseDate)

  if (!timestamp) return false

  const releaseDate = new Date(timestamp)
  const normalizedRelease = Date.UTC(
    now.getUTCFullYear(),
    releaseDate.getUTCMonth(),
    releaseDate.getUTCDate(),
  )
  const normalizedToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )

  const diffDays = Math.abs(
    (normalizedRelease - normalizedToday) / (24 * 60 * 60 * 1000),
  )

  return diffDays <= 5
}

export const useGetMostPlayed = () => {
  return useQuery({
    ...createHomeAlbumListQuery(queryKeys.album.mostPlayed, 'frequent'),
    ...HOME_QUERY_BASE,
  })
}

export const useGetRecentlyPlayed = () => {
  return useQuery({
    ...createHomeAlbumListQuery(queryKeys.album.recentlyPlayed, 'recent'),
    refetchInterval: convertMinutesToMs(2),
    staleTime: convertMinutesToMs(1),
    gcTime: convertMinutesToMs(20),
    refetchOnWindowFocus: false,
  })
}

export const useGetRandomAlbums = () => {
  return useQuery({
    ...createHomeAlbumListQuery(queryKeys.album.random, 'random'),
    ...HOME_QUERY_BASE,
  })
}

export const useHomeFeedData = () => {
  const [recentlyAdded, recentlyPlayed, mostPlayed] = useQueries({
    queries: [
      {
        ...createHomeAlbumListQuery(queryKeys.album.recentlyAdded, 'newest'),
        staleTime: 0,
        gcTime: convertMinutesToMs(30),
        refetchOnWindowFocus: true,
      },
      {
        ...createHomeAlbumListQuery(queryKeys.album.recentlyPlayed, 'recent'),
        refetchInterval: convertMinutesToMs(2),
        staleTime: convertMinutesToMs(1),
        gcTime: convertMinutesToMs(20),
        refetchOnWindowFocus: false,
      },
      {
        ...createHomeAlbumListQuery(queryKeys.album.mostPlayed, 'frequent'),
        ...HOME_QUERY_BASE,
      },
    ],
  })

  const similarArtists = useGetSimilarArtistsDiscovery()

  return {
    similarArtists,
    recentlyAdded,
    recentlyPlayed,
    mostPlayed,
  }
}

export const useHomeDashboardData = () => {
  const feed = useHomeFeedData()
  const genresQuery = useGetGenres()
  const homeLoadStartRef = useRef<number | null>(null)

  const genres = useMemo(
    () => deriveGenreDiscoveryItems(genresQuery.data, feed.mostPlayed.data),
    [feed.mostPlayed.data, genresQuery.data],
  )

  const homeLoading =
    feed.similarArtists.isLoading ||
    feed.recentlyAdded.isLoading ||
    feed.recentlyPlayed.isLoading ||
    feed.mostPlayed.isLoading ||
    genresQuery.isLoading

  useEffect(() => {
    if (homeLoading) {
      if (homeLoadStartRef.current === null) {
        homeLoadStartRef.current = performance.now()
      }
      return
    }

    if (homeLoadStartRef.current === null) return

    const elapsedMs = performance.now() - homeLoadStartRef.current
    homeLoadStartRef.current = null

    logger.info('[Perf][Home] Dashboard loaded', {
      elapsedMs: Math.round(elapsedMs),
      similarArtists: feed.similarArtists.data?.list?.length ?? 0,
      recentlyAdded: feed.recentlyAdded.data?.list?.length ?? 0,
      recentlyPlayed: feed.recentlyPlayed.data?.list?.length ?? 0,
      genres: genres.length,
    })
  }, [
    feed.recentlyAdded.data?.list?.length,
    feed.recentlyPlayed.data?.list?.length,
    feed.similarArtists.data?.list?.length,
    genres.length,
    homeLoading,
  ])

  return {
    ...feed,
    genres,
    isGenresLoading: genresQuery.isLoading || feed.mostPlayed.isLoading,
  }
}

// Get all genres
export const useGetGenres = () => {
  return useQuery({
    queryKey: [queryKeys.genre.all],
    queryFn: () => subsonic.genres.get(),
    staleTime: convertMinutesToMs(30),
    gcTime: convertMinutesToMs(60),
    refetchOnWindowFocus: false,
  })
}

// Get albums by genre
export const useGetAlbumsByGenre = (genre: string, size: number = 16) => {
  return useQuery({
    queryKey: [queryKeys.album.byGenre, genre],
    queryFn: () =>
      subsonic.albums.getAlbumList({
        size,
        type: 'byGenre',
        genre,
      }),
    enabled: !!genre,
    staleTime: convertMinutesToMs(15),
    gcTime: convertMinutesToMs(45),
    refetchOnWindowFocus: false,
  })
}

// Get genre discovery: pick random popular genres and fetch albums
export const useGetGenreDiscovery = () => {
  const { data: genres, isLoading: genresLoading } = useGetGenres()
  const { data: mostPlayed } = useGetMostPlayed()
  const selectedGenreItems = useMemo(
    () => deriveGenreDiscoveryItems(genres, mostPlayed),
    [genres, mostPlayed],
  )

  return {
    genres: selectedGenreItems,
    isLoading: genresLoading,
  }
}

// Get similar artists discovery based on listening history
export const useGetSimilarArtistsDiscovery = () => {
  const { data: mostPlayed } = useGetMostPlayed()
  const { data: recentlyPlayed } = useGetRecentlyPlayed()

  // Extract top artists and genres from listening history
  const { topGenres, topArtistIds } = useMemo(() => {
    const artistCounts = new Map<
      string,
      { count: number; id: string; genre?: string }
    >()
    const genreCounts = new Map<string, number>()
    const artistIds = new Set<string>()

    // Combine most played and recently played
    const allAlbums = [
      ...(mostPlayed?.list || []),
      ...(recentlyPlayed?.list || []),
    ]

    allAlbums.forEach((album) => {
      if (album.artist && album.artistId) {
        artistIds.add(album.artistId)
        const current = artistCounts.get(album.artist) || {
          count: 0,
          id: album.artistId,
          genre: album.genre,
        }
        artistCounts.set(album.artist, {
          ...current,
          count: current.count + 1,
        })
      }

      if (album.genre) {
        genreCounts.set(album.genre, (genreCounts.get(album.genre) || 0) + 1)
      }
    })

    // Get top 3 genres
    const topGenresList = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre)

    return {
      topGenres: topGenresList,
      topArtistIds: Array.from(artistIds),
    }
  }, [mostPlayed, recentlyPlayed])

  // Fetch random albums from top genres (excluding top artists)
  return useQuery({
    queryKey: [queryKeys.album.similarArtists, topGenres, topArtistIds],
    queryFn: async () => {
      if (topGenres.length === 0) {
        // Fallback to random albums if no genres found
        return subsonic.albums.getAlbumList({
          size: 10,
          type: 'random',
        })
      }

      // Get albums from one of the top genres
      const randomGenre =
        topGenres[Math.floor(Math.random() * topGenres.length)]
      const albums = await subsonic.albums.getAlbumList({
        size: 50, // Get more to filter
        type: 'byGenre',
        genre: randomGenre,
      })

      if (!albums?.list) return { list: [], albumsCount: 0 }

      // Filter out albums from top artists (to show discovery)
      const discoveryAlbums = albums.list.filter(
        (album) => !topArtistIds.includes(album.artistId || ''),
      )

      // Shuffle and take 10
      const shuffled = discoveryAlbums
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)

      return {
        list: shuffled,
        albumsCount: shuffled.length,
      }
    },
    enabled: !!mostPlayed || !!recentlyPlayed,
    staleTime: convertMinutesToMs(10),
    gcTime: convertMinutesToMs(30),
    refetchOnWindowFocus: false,
  })
}
