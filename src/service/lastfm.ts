interface LastFmApiParams {
  method: string
  [key: string]: string | number
}

interface LastFmArtist {
  name: string
  playcount: string
  mbid?: string
  url: string
}

interface LastFmSimilarArtist {
  name: string
  match: string
  url: string
  mbid?: string
}

interface TopArtistsResponse {
  topartists: {
    artist: LastFmArtist[]
    '@attr': {
      page: string
      total: string
      user: string
      perPage: string
      totalPages: string
    }
  }
}

interface SimilarArtistsResponse {
  similarartists: {
    artist: LastFmSimilarArtist[]
    '@attr': {
      artist: string
    }
  }
}

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/'

async function makeRequest<T>(
  apiKey: string,
  params: LastFmApiParams,
): Promise<T> {
  const url = new URL(LASTFM_API_URL)
  url.searchParams.append('api_key', apiKey)
  url.searchParams.append('format', 'json')

  Object.entries(params).forEach(([key, value]) => {
    let strValue = String(value)
    if ((key === 'artist' || key === 'track') && strValue.includes('+')) {
      strValue = strValue.replace(/\+/g, '%2B')
    }
    url.searchParams.append(key, strValue)
  })

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.statusText}`)
  }

  return response.json()
}

async function getTopArtists(
  username: string,
  apiKey: string,
  period:
    | 'overall'
    | '7day'
    | '1month'
    | '3month'
    | '6month'
    | '12month' = 'overall',
  limit: number = 50,
): Promise<LastFmArtist[]> {
  const response = await makeRequest<TopArtistsResponse>(apiKey, {
    method: 'user.getTopArtists',
    user: username,
    period,
    limit,
  })

  return response.topartists?.artist || []
}

async function getSimilarArtists(
  artistName: string,
  apiKey: string,
  limit: number = 20,
): Promise<LastFmSimilarArtist[]> {
  const response = await makeRequest<SimilarArtistsResponse>(apiKey, {
    method: 'artist.getSimilar',
    artist: artistName,
    limit,
  })

  return response.similarartists?.artist || []
}

export const lastfm = {
  getTopArtists,
  getSimilarArtists,
}

export type { LastFmArtist, LastFmSimilarArtist }
