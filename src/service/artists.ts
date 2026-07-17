import { httpClient } from '@/api/httpClient'
import { normalizeSimilarArtists } from '@/service/mappers/artist'
import { useAppStore } from '@/store/app.store'
import {
  ArtistInfoResponse,
  ArtistResponse,
  ArtistsResponse,
  IArtistInfo,
  ISimilarArtist,
} from '@/types/responses/artist'
import { SubsonicResponse } from '@/types/responses/subsonicResponse'

type LastFmImage = { size?: string; '#text'?: string }
type LastFmGetInfoPayload = {
  artist?: {
    url?: string
    mbid?: string
    bio?: { summary?: string }
    image?: LastFmImage[]
  }
}

type LastFmSearchArtist = { name?: string; url?: string; mbid?: string }
type LastFmSearchPayload = {
  results?: {
    artistmatches?: {
      artist?: LastFmSearchArtist | LastFmSearchArtist[]
    }
  }
}

function hasArtistInfo(info?: IArtistInfo) {
  return Boolean(
    info &&
      (info.biography?.trim() ||
        info.lastFmUrl?.trim() ||
        info.musicBrainzId?.trim() ||
        info.largeImageUrl?.trim() ||
        info.mediumImageUrl?.trim() ||
        info.smallImageUrl?.trim() ||
        info.similarArtist?.length),
  )
}

function sanitizeImageUrl(value?: string) {
  const url = value?.trim()
  if (!url) return undefined
  const lowered = url.toLowerCase()
  // Generic placeholder patterns used by Last.fm and similar providers.
  if (lowered.includes('/2a96cbd8b46e442fc41c2b86b821562f')) return undefined
  if (lowered.includes('/noimage/')) return undefined
  if (lowered.includes('default') && lowered.includes('artist'))
    return undefined
  return url
}

function normalizeArtistName(value?: string) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeUriComponentSafe(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function buildArtistNameVariants(input: string) {
  const variants = new Set<string>()
  const trimmed = input.trim()
  if (!trimmed) return []

  variants.add(trimmed)

  let decoded = trimmed
  for (let i = 0; i < 3; i += 1) {
    const next = decodeUriComponentSafe(decoded).trim()
    if (!next || next === decoded) break
    variants.add(next)
    decoded = next
  }

  // Common API-path encoded form sometimes stored in tags.
  variants.add(trimmed.replace(/%20/g, ' '))

  return [...variants].filter(Boolean)
}

function decodeRecursively(value: string) {
  let current = value
  for (let i = 0; i < 4; i += 1) {
    const next = decodeUriComponentSafe(current)
    if (!next || next === current) break
    current = next
  }
  return current
}

function extractArtistSlug(url?: string) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1] ?? ''
    return decodeRecursively(lastSegment).trim()
  } catch {
    return ''
  }
}

function similarityScore(
  candidateName: string,
  candidateSlug: string,
  targetName: string,
) {
  const candidateRaw = candidateName.trim().toLowerCase()
  const slugRaw = candidateSlug.trim().toLowerCase()
  const targetRaw = targetName.trim().toLowerCase()

  if (!candidateRaw) return 0

  const candidateNorm = normalizeArtistName(candidateName)
  const slugNorm = normalizeArtistName(candidateSlug)
  const targetNorm = normalizeArtistName(targetName)

  let score = 0
  if (candidateRaw === targetRaw) score += 100
  if (slugRaw && slugRaw === targetRaw) score += 90
  if (candidateNorm && candidateNorm === targetNorm) score += 70
  if (slugNorm && slugNorm === targetNorm) score += 65
  if (candidateNorm.includes(targetNorm) || targetNorm.includes(candidateNorm))
    score += 20
  if (
    slugNorm &&
    (slugNorm.includes(targetNorm) || targetNorm.includes(slugNorm))
  )
    score += 15

  return score
}

function mapLastFmArtistInfo(
  payload: LastFmGetInfoPayload,
): IArtistInfo | undefined {
  const artist = payload?.artist
  if (!artist) return undefined

  const images = Array.isArray(artist.image) ? artist.image : []
  const findImage = (size: string) =>
    images.find((img) => img?.size === size)?.['#text'] || undefined

  const biography =
    typeof artist.bio?.summary === 'string' ? artist.bio.summary : undefined
  const lastFmUrl = typeof artist.url === 'string' ? artist.url : undefined
  const musicBrainzId =
    typeof artist.mbid === 'string' ? artist.mbid : undefined
  const smallImageUrl = sanitizeImageUrl(findImage('small'))
  const mediumImageUrl = sanitizeImageUrl(findImage('medium'))
  const largeImageUrl =
    sanitizeImageUrl(findImage('large')) ||
    sanitizeImageUrl(findImage('extralarge'))

  const mapped: IArtistInfo = {
    biography,
    lastFmUrl,
    musicBrainzId,
    smallImageUrl,
    mediumImageUrl,
    largeImageUrl,
  }

  return hasArtistInfo(mapped) ? mapped : undefined
}

async function resolveMusicBrainzMbid(
  artistName: string,
): Promise<string | undefined> {
  try {
    const mbUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(artistName)}&fmt=json`
    const mbResponse = await fetch(mbUrl, {
      headers: {
        'User-Agent': 'Sona/0.20.0 ( contact@sona.app )',
      },
    })
    if (mbResponse.ok) {
      const mbData = await mbResponse.json()
      const firstArtist = mbData?.artists?.[0]
      if (
        firstArtist &&
        (firstArtist.score >= 90 ||
          firstArtist.name.toLowerCase() === artistName.toLowerCase())
      ) {
        return firstArtist.id || undefined
      }
    }
  } catch (err) {
    console.warn(
      '[artists.resolveMusicBrainzMbid] fallback lookup failed:',
      err,
    )
  }
  return undefined
}

async function fetchLastFmArtistInfoByName(artistName: string, apiKey: string) {
  const mbid = await resolveMusicBrainzMbid(artistName)
  if (mbid) {
    const byMbid = await fetchLastFmArtistInfoByMbid(mbid, apiKey)
    if (byMbid) {
      if (import.meta.env.DEV) {
        console.info(
          '[artists.fetchLastFmArtistInfoByName] resolved via MusicBrainz MBID:',
          mbid,
        )
      }
      return byMbid
    }
  }

  const endpoint = 'https://ws.audioscrobbler.com/2.0/'

  const getArtistInfo = async (name: string) => {
    const url = new URL(endpoint)
    url.searchParams.set('method', 'artist.getinfo')
    url.searchParams.set('artist', name)
    url.searchParams.set('autocorrect', '1')
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('format', 'json')
    const response = await fetch(url.toString())
    if (!response.ok) return undefined
    const payload = (await response.json()) as LastFmGetInfoPayload & {
      error?: unknown
    }
    if (payload?.error) return undefined
    return mapLastFmArtistInfo(payload)
  }

  const variants = buildArtistNameVariants(artistName)

  for (const variant of variants) {
    const direct = await getArtistInfo(variant)
    if (direct) return direct
  }

  // Fallback for names with special characters: resolve canonical name via search.
  for (const variant of variants) {
    const searchUrl = new URL(endpoint)
    searchUrl.searchParams.set('method', 'artist.search')
    searchUrl.searchParams.set('artist', variant)
    searchUrl.searchParams.set('limit', '30')
    searchUrl.searchParams.set('api_key', apiKey)
    searchUrl.searchParams.set('format', 'json')
    const searchResponse = await fetch(searchUrl.toString())
    if (!searchResponse.ok) continue
    const searchPayload = (await searchResponse.json()) as LastFmSearchPayload

    const candidates = searchPayload?.results?.artistmatches?.artist
    const candidateList = Array.isArray(candidates)
      ? candidates
      : candidates
        ? [candidates]
        : []

    if (candidateList.length === 0) continue

    const best = [...candidateList]
      .map((candidate) => {
        const candidateName = candidate?.name ?? ''
        const candidateSlug = extractArtistSlug(candidate?.url)
        const score = similarityScore(candidateName, candidateSlug, variant)
        return { candidate, score }
      })
      .sort((a, b) => b.score - a.score)[0]?.candidate

    const resolvedName = typeof best?.name === 'string' ? best.name : undefined
    if (!resolvedName) continue

    const resolved = await getArtistInfo(resolvedName)
    if (resolved) return resolved
  }

  return undefined
}

async function fetchLastFmArtistInfoByMbid(mbid: string, apiKey: string) {
  const endpoint = 'https://ws.audioscrobbler.com/2.0/'
  const normalizedMbid = mbid.trim()
  if (!normalizedMbid) return undefined

  const url = new URL(endpoint)
  url.searchParams.set('method', 'artist.getinfo')
  url.searchParams.set('mbid', normalizedMbid)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('format', 'json')

  const response = await fetch(url.toString())
  if (!response.ok) return undefined
  const payload = (await response.json()) as LastFmGetInfoPayload & {
    error?: unknown
  }
  if (payload?.error) return undefined
  return mapLastFmArtistInfo(payload)
}

async function getAll() {
  const response = await httpClient<ArtistsResponse>('/getArtists', {
    method: 'GET',
  })

  if (!response) return []

  const artistsList: ISimilarArtist[] = []

  response.data.artists.index.forEach((item) => {
    artistsList.push(...item.artist)
  })

  const normalizedArtists = normalizeSimilarArtists(artistsList)
  const sortedArtists = normalizedArtists.sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  return sortedArtists.map((artist) => ({
    ...artist,
    coverArt: artist.coverArt || sanitizeImageUrl(artist.artistImageUrl) || '',
    coverArtType: 'artist' as const,
  }))
}

async function getOne(id: string) {
  const response = await httpClient<ArtistResponse>('/getArtist', {
    method: 'GET',
    query: {
      id,
    },
  })

  return response?.data.artist
}

async function getInfo(id: string) {
  type ArtistInfo2Response = SubsonicResponse<{
    artistInfo2?: IArtistInfo
  }>

  const info2Response = await httpClient<ArtistInfo2Response>(
    '/getArtistInfo2',
    {
      method: 'GET',
      query: {
        id,
      },
    },
  )

  const info2 = info2Response?.data.artistInfo2

  const response = await httpClient<ArtistInfoResponse>('/getArtistInfo', {
    method: 'GET',
    query: {
      id,
    },
  })

  const info1 = response?.data.artistInfo

  const hasSubsonicBio = Boolean(
    info2?.biography?.trim() || info1?.biography?.trim(),
  )
  const apiKey = useAppStore.getState().integrations.lastfm.apiKey?.trim()

  if (
    apiKey &&
    (!hasSubsonicBio || (!hasArtistInfo(info2) && !hasArtistInfo(info1)))
  ) {
    try {
      const artist = await getOne(id)
      const artistName = artist?.name?.trim()
      const musicBrainzId = artist?.musicBrainzId?.trim()

      let lastFmInfo: IArtistInfo | undefined

      if (musicBrainzId) {
        lastFmInfo = await fetchLastFmArtistInfoByMbid(musicBrainzId, apiKey)
      }

      if (!lastFmInfo && artistName) {
        lastFmInfo = await fetchLastFmArtistInfoByName(artistName, apiKey)
      }

      if (lastFmInfo) {
        if (import.meta.env.DEV) {
          console.info(
            '[artists.getInfo] enriched missing subsonic biography with Last.fm direct fetch for',
            artistName,
          )
        }
        return {
          biography:
            lastFmInfo.biography?.trim() ||
            info2?.biography ||
            info1?.biography,
          lastFmUrl:
            lastFmInfo.lastFmUrl?.trim() ||
            info2?.lastFmUrl ||
            info1?.lastFmUrl,
          musicBrainzId:
            lastFmInfo.musicBrainzId?.trim() ||
            info2?.musicBrainzId ||
            info1?.musicBrainzId ||
            musicBrainzId ||
            undefined,
          smallImageUrl:
            lastFmInfo.smallImageUrl ||
            info2?.smallImageUrl ||
            info1?.smallImageUrl,
          mediumImageUrl:
            lastFmInfo.mediumImageUrl ||
            info2?.mediumImageUrl ||
            info1?.mediumImageUrl,
          largeImageUrl:
            lastFmInfo.largeImageUrl ||
            info2?.largeImageUrl ||
            info1?.largeImageUrl,
          similarArtist: lastFmInfo.similarArtist?.length
            ? lastFmInfo.similarArtist
            : info2?.similarArtist || info1?.similarArtist,
        }
      }
    } catch (e) {
      console.warn('[artists.getInfo] Failed to enrich with Last.fm:', e)
    }
  }

  if (hasArtistInfo(info2)) {
    return info2
  }

  if (hasArtistInfo(info1)) {
    return info1
  }

  try {
    const artist = await getOne(id)
    if (!artist) return info1
    const fallback: IArtistInfo = {
      musicBrainzId: artist.musicBrainzId?.trim() || undefined,
      largeImageUrl: sanitizeImageUrl(artist.artistImageUrl),
      mediumImageUrl: sanitizeImageUrl(artist.artistImageUrl),
      smallImageUrl: sanitizeImageUrl(artist.artistImageUrl),
    }
    return hasArtistInfo(fallback) ? fallback : info1
  } catch {
    return info1
  }
}

async function fetchLastFmTopTracks(
  artistName: string,
  apiKey: string,
  mbid?: string,
): Promise<string[]> {
  const endpoint = 'https://ws.audioscrobbler.com/2.0/'
  const getTracks = async (params: Record<string, string>) => {
    const url = new URL(endpoint)
    url.searchParams.set('method', 'artist.gettoptracks')
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '50')
    const response = await fetch(url.toString())
    if (!response.ok) return []
    const data = await response.json()
    const trackList = data?.toptracks?.track
    if (!trackList) return []
    const arr = Array.isArray(trackList) ? trackList : [trackList]
    return arr.map((t: any) => t.name).filter(Boolean)
  }

  if (mbid) {
    const tracks = await getTracks({ mbid })
    if (tracks.length > 0) return tracks
  }

  const variants = buildArtistNameVariants(artistName)
  for (const variant of variants) {
    const tracks = await getTracks({ artist: variant })
    if (tracks.length > 0) return tracks
  }
  return []
}

async function getTopSongsFallback(artistName: string): Promise<any[]> {
  const apiKey = useAppStore.getState().integrations.lastfm.apiKey?.trim()
  if (!apiKey) return []

  try {
    const mbid = await resolveMusicBrainzMbid(artistName)
    const trackNames = await fetchLastFmTopTracks(artistName, apiKey, mbid)
    if (trackNames.length === 0) return []

    // Fetch all local songs for this artist via search3
    const localSongsResponse = await httpClient<{
      searchResult2?: { song?: any[] }
    }>('/search3', {
      method: 'GET',
      query: {
        query: artistName,
        songCount: 1000,
        artistCount: 0,
        albumCount: 0,
      },
    })
    const localSongs = localSongsResponse?.data?.searchResult2?.song ?? []
    if (localSongs.length === 0) return []

    const matchedSongs: any[] = []
    const normalizeString = (str: string) =>
      str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')

    const artistNameNorm = normalizeString(artistName)

    for (const trackName of trackNames) {
      const trackNameNorm = normalizeString(trackName)
      const match = localSongs.find((song) => {
        const songArtistNorm = normalizeString(song.artist)
        const songTitleNorm = normalizeString(song.title)
        return (
          (songArtistNorm === artistNameNorm ||
            songArtistNorm.includes(artistNameNorm) ||
            artistNameNorm.includes(songArtistNorm)) &&
          (songTitleNorm === trackNameNorm ||
            songTitleNorm.includes(trackNameNorm) ||
            trackNameNorm.includes(songTitleNorm))
        )
      })
      if (match) {
        matchedSongs.push(match)
      }
    }
    return matchedSongs
  } catch (err) {
    console.warn('[artists.getTopSongsFallback] failed:', err)
    return []
  }
}

export const artists = {
  getOne,
  getInfo,
  getAll,
  getTopSongsFallback,
}
