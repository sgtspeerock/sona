import { subsonic } from '@/service/subsonic'

export type RadioNowPlaying = {
  rawTitle: string
  artist: string | null
  track: string | null
  coverUrl: string | null
  sourceUrl: string
}

type RadioStationImageParams = {
  homePageUrl?: string
  streamUrl: string
}

type Candidate = {
  url: string
  parser: 'json' | 'text' | 'html7'
}

type GenericJson = Record<string, unknown>

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function unique<T>(arr: T[]) {
  return [...new Set(arr)]
}

function getOrigin(urlLike?: string) {
  if (!urlLike) return null
  try {
    return new URL(urlLike).origin
  } catch {
    return null
  }
}

function getHost(urlLike?: string) {
  if (!urlLike) return null
  try {
    return new URL(urlLike).hostname
  } catch {
    return null
  }
}

export function getRadioStationImageFallback({
  homePageUrl,
  streamUrl: _streamUrl,
}: RadioStationImageParams) {
  const homeOrigin = getOrigin(homePageUrl)
  if (homeOrigin) return `${homeOrigin}/favicon.ico`

  // Do not fallback to stream host favicon:
  // many stations share the same streaming host/CDN and would all show
  // the same (wrong) image.
  const homeHost = getHost(homePageUrl)
  if (homeHost) return `https://${homeHost}/favicon.ico`

  return null
}

function buildPathPrefixes(pathname: string) {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  const parts = normalized.split('/').filter(Boolean)
  const prefixes = ['/']
  for (let i = 0; i < parts.length; i++) {
    prefixes.push(`/${parts.slice(0, i + 1).join('/')}`)
  }
  return unique(prefixes)
}

function buildCandidates(streamUrl: string, homePageUrl?: string): Candidate[] {
  const origins: string[] = []
  let streamPath = ''

  const addOriginFrom = (urlLike?: string) => {
    if (!urlLike) return
    try {
      const parsed = new URL(urlLike)
      origins.push(parsed.origin)
      if (!streamPath && parsed.pathname) {
        streamPath = parsed.pathname
      }
    } catch {
      // ignore invalid URL
    }
  }

  addOriginFrom(streamUrl)
  addOriginFrom(homePageUrl)

  const distinctOrigins = unique(origins)
  const list: Candidate[] = []

  for (const origin of distinctOrigins) {
    const prefixes = buildPathPrefixes(streamPath || '/')

    for (const prefix of prefixes) {
      const p = prefix === '/' ? '' : prefix
      list.push({ url: `${origin}${p}/status-json.xsl`, parser: 'json' })
      list.push({ url: `${origin}${p}/stats?sid=1&json=1`, parser: 'json' })
      list.push({ url: `${origin}${p}/currentsong?sid=1`, parser: 'text' })
      list.push({ url: `${origin}${p}/7.html`, parser: 'html7' })
    }

    list.push({ url: `${origin}/status-json.xsl`, parser: 'json' })
    list.push({ url: `${origin}/stats?sid=1&json=1`, parser: 'json' })
    list.push({ url: `${origin}/currentsong?sid=1`, parser: 'text' })
    list.push({ url: `${origin}/7.html`, parser: 'html7' })
    list.push({ url: `${origin}/api/nowplaying`, parser: 'json' })
    list.push({ url: `${origin}/api/nowplaying/1`, parser: 'json' })

    if (streamPath && streamPath !== '/') {
      const mount = streamPath.startsWith('/') ? streamPath : `/${streamPath}`
      list.push({
        url: `${origin}/status-json.xsl?mount=${encodeURIComponent(mount)}`,
        parser: 'json',
      })
      list.push({
        url: `${origin}/status-json.xsl?mount=${mount}`,
        parser: 'json',
      })
    }
  }

  return unique(list.map((entry) => `${entry.parser}|${entry.url}`)).map(
    (serialized) => {
      const [parser, ...rest] = serialized.split('|')
      return { parser: parser as Candidate['parser'], url: rest.join('|') }
    },
  )
}

function splitArtistTrack(rawTitle: string) {
  const clean = normalizeApostrophes(decodeHtmlEntities(rawTitle))
    .replace(/\s+/g, ' ')
    .replaceAll('\0', '')
    .replace(/\s+\[[^\]]*kbps[^\]]*]$/i, '')
    .replace(/\s+\([^)]*kbps[^)]*\)$/i, '')
    .trim()
  if (!clean) return { artist: null, track: null, rawTitle: '' }

  const delimiters = [' - ', ' – ', ' — ', ' | ', ' ~ ']
  for (const delimiter of delimiters) {
    const idx = clean.indexOf(delimiter)
    if (idx > 0) {
      const artist = clean.slice(0, idx).trim()
      const track = clean.slice(idx + delimiter.length).trim()
      if (artist && track) return { artist, track, rawTitle: clean }
    }
  }

  return { artist: null, track: clean, rawTitle: clean }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;|&#8217;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function normalizeApostrophes(value: string) {
  return value.replace(/\\'/g, "'").replace(/[’‘`´]/g, "'")
}

function isLikelyGarbageTitle(value: string) {
  const s = value.trim()
  if (!s) return true

  // Very short garbage / high replacement char ratio
  const replacementCount = (s.match(/�/g) ?? []).length
  if (replacementCount > 0 && replacementCount / s.length > 0.08) return true

  // Too many control chars / nulls
  let controlCount = 0
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if ((code >= 0 && code <= 8) || (code >= 11 && code <= 31) || code === 127)
      controlCount += 1
  }
  if (controlCount > 0 && controlCount / s.length > 0.03) return true

  // Needs at least some readable characters
  const readableCount = (s.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]/g) ?? []).length
  if (readableCount < 3) return true

  return false
}

function isLikelyPlaceholderNowPlayingTitle(value: string) {
  const s = value.trim()
  if (!s) return true

  // Some streams expose IDs instead of artist/title.
  if (/^\d+\s*-\s*\d+$/.test(s)) return true
  if (/^\d{5,}$/.test(s)) return true

  // Generic station placeholders.
  if (/^(stream|radio|live|on air)$/i.test(s)) return true

  return false
}

function isLikelyStationSlogan(params: {
  value: string
  stationName?: string
  streamUrl: string
  homePageUrl?: string
}) {
  const { value, stationName, streamUrl, homePageUrl } = params
  const s = value.trim()
  if (!s) return true

  const looksLikeArtistTrack =
    /.+\s[-–—|~]\s.+/.test(s) &&
    !/\bmp3\b/i.test(s) &&
    !/\b(on air|live stream|best hits|radio)\b/i.test(s)
  if (looksLikeArtistTrack) return false

  let hostTokens: string[] = []
  try {
    const streamHost = new URL(streamUrl).hostname.replace(/^www\./, '')
    const homeHost = homePageUrl
      ? new URL(homePageUrl).hostname.replace(/^www\./, '')
      : ''
    hostTokens = [streamHost, homeHost]
      .filter(Boolean)
      .flatMap((host) => host.split('.'))
      .filter(
        (token) => token.length >= 3 && !/^(com|net|de|fm|org)$/.test(token),
      )
  } catch {
    // ignore
  }

  const stationTokens = [
    ...(stationName ? normalizeText(stationName).split(' ') : []),
    ...hostTokens.map((token) => normalizeText(token)),
  ].filter((token) => token.length >= 3)

  const normalizedTitle = normalizeText(s)
  const mentionsStation = stationTokens.some((token) =>
    normalizedTitle.includes(token),
  )

  const promoPattern =
    /\b(radio|live|stream|music|hits|charts|best|rock|pop|news|talk|mp3)\b/i.test(
      s,
    ) || /\bmp3\b/i.test(s)

  if (mentionsStation && promoPattern) return true
  if (/\bmp3\b/i.test(s) && !looksLikeArtistTrack) return true

  return false
}

function tryFixMojibake(value: string) {
  // Very common UTF-8 interpreted as Latin-1 artifacts.
  // Example: "Björk" -> "BjÃ¶rk"
  if (!/[Ãâ][\u0080-\u00ff]/.test(value)) return value
  try {
    const bytes = Uint8Array.from([...value].map((char) => char.charCodeAt(0)))
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    return value
  }
}

function scoreSourceMatch(
  source: GenericJson,
  streamPathNormalized: string,
  streamUrlNormalized: string,
) {
  const mount = String(
    source.listenurl ?? source.mount ?? source.server_url ?? '',
  )
  const mountNorm = normalizeText(mount)
  let score = 0
  if (streamPathNormalized && mountNorm.includes(streamPathNormalized))
    score += 120
  if (streamUrlNormalized && mountNorm.includes(streamUrlNormalized))
    score += 80
  if (typeof source.listeners === 'number')
    score += Math.min(30, source.listeners)
  if (source.title) score += 50
  return score
}

function pickBestSource(
  sources: GenericJson[],
  streamPath: string,
  streamUrl: string,
) {
  const streamPathNormalized = normalizeText(streamPath)
  const streamUrlNormalized = normalizeText(streamUrl)
  let best: GenericJson | null = null
  let bestScore = -1
  for (const source of sources) {
    const score = scoreSourceMatch(
      source,
      streamPathNormalized,
      streamUrlNormalized,
    )
    if (score > bestScore) {
      best = source
      bestScore = score
    }
  }
  return best
}

function extractTitleFromJson(
  text: string,
  context: { streamPath: string; streamUrl: string },
): string | null {
  let data: GenericJson
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    data = parsed as GenericJson
  } catch {
    return null
  }

  // Icecast /status-json.xsl
  const icestats = (data.icestats as GenericJson | undefined)?.source
  const iceSources = Array.isArray(icestats)
    ? icestats
    : icestats
      ? [icestats]
      : []
  const mappedSources = iceSources
    .filter((source) => source && typeof source === 'object')
    .map((source) => source as GenericJson)

  const bestIceSource = pickBestSource(
    mappedSources,
    context.streamPath,
    context.streamUrl,
  )
  if (bestIceSource) {
    const bestTitle =
      bestIceSource.title ??
      bestIceSource.yp_currently_playing ??
      bestIceSource.songtitle
    if (typeof bestTitle === 'string' && bestTitle.trim())
      return bestTitle.trim()
  }

  for (const source of mappedSources) {
    const sourceObj =
      source && typeof source === 'object' ? (source as GenericJson) : null
    const title =
      sourceObj?.title ??
      sourceObj?.yp_currently_playing ??
      sourceObj?.songtitle
    if (typeof title === 'string' && title.trim()) return title.trim()
  }

  // Shoutcast /stats?sid=1&json=1
  const shoutTitle = data.songtitle ?? data.servertitle ?? data.title
  if (typeof shoutTitle === 'string' && shoutTitle.trim()) {
    return shoutTitle.trim()
  }

  // AzuraCast-style
  const azuraNowPlaying = data.now_playing as GenericJson | undefined
  const azura = azuraNowPlaying?.song as GenericJson | undefined
  if (azura?.artist && azura?.title) return `${azura.artist} - ${azura.title}`
  if (typeof azura?.text === 'string' && azura.text.trim())
    return azura.text.trim()

  // AzuraCast list-style API
  if (Array.isArray(data)) {
    for (const station of data) {
      if (!station || typeof station !== 'object') continue
      const stationObj = station as GenericJson
      const now = stationObj.now_playing as GenericJson | undefined
      const song = now?.song as GenericJson | undefined
      if (song?.artist && song?.title) return `${song.artist} - ${song.title}`
      if (typeof song?.text === 'string' && song.text.trim())
        return song.text.trim()
    }
  }

  return null
}

function extractTitleFromText(text: string): string | null {
  const clean = text.trim()
  if (!clean) return null

  // ICY metadata style:
  // StreamTitle='Artist - Track';StreamUrl='';
  const streamTitleMatch = clean.match(
    /StreamTitle='([^']*)'|StreamTitle="([^"]*)"/i,
  )
  const streamTitle =
    streamTitleMatch?.[1]?.trim() ?? streamTitleMatch?.[2]?.trim() ?? ''
  if (streamTitle && !isLikelyGarbageTitle(streamTitle)) return streamTitle

  // Shoutcast v1/v2 XML-ish response
  const xmlTitleMatch = clean.match(/<SONGTITLE>([^<]+)<\/SONGTITLE>/i)
  const xmlTitle = xmlTitleMatch?.[1]?.trim() ?? ''
  if (xmlTitle && !isLikelyGarbageTitle(xmlTitle)) return xmlTitle

  // currentsong plain text
  if (
    !clean.includes('\n') &&
    clean.length <= 200 &&
    !isLikelyGarbageTitle(clean)
  )
    return clean

  return null
}

function extractTitleFromHtml7(text: string): string | null {
  const clean = text.trim()
  // Typical format: "1,1,160,1,Artist - Track"
  const line = clean.split('\n').find((l) => l.includes(','))
  if (!line) return null

  const parts = line.split(',')
  const maybeTitle = parts[parts.length - 1]?.trim()
  if (!maybeTitle) return null

  const unescaped = maybeTitle.replace(/<[^>]*>/g, '').trim()
  return unescaped || null
}

async function fetchTextViaDesktop(url: string) {
  if (!window.api?.fetchExternalText) {
    try {
      const response = await fetch(url, { method: 'GET' })
      return {
        ok: response.ok,
        status: response.status,
        text: await response.text(),
        finalUrl: response.url,
      }
    } catch {
      return { ok: false, status: 0, text: '', finalUrl: '' }
    }
  }

  return window.api.fetchExternalText(url)
}

async function fetchIcyTitleViaDesktop(streamUrl: string) {
  if (!window.api?.fetchIcyMetadata) return null
  try {
    const response = await window.api.fetchIcyMetadata(streamUrl)
    const title = response?.title?.trim()
    return title ? title : null
  } catch {
    return null
  }
}

export async function resolveRadioNowPlaying(params: {
  streamUrl: string
  homePageUrl?: string
  stationName?: string
  lastFmApiKey?: string
}): Promise<RadioNowPlaying | null> {
  const { streamUrl, homePageUrl, stationName, lastFmApiKey } = params
  const streamPath = (() => {
    try {
      return new URL(streamUrl).pathname || '/'
    } catch {
      return '/'
    }
  })()

  // Primary path: most radio streams expose ICY StreamTitle directly.
  // This avoids parsing binary stream bytes as text and is far more reliable.
  const icyTitle = await fetchIcyTitleViaDesktop(streamUrl)
  if (icyTitle) {
    const fixedTitle = tryFixMojibake(icyTitle)
    const split = splitArtistTrack(fixedTitle)
    if (
      !isLikelyGarbageTitle(split.rawTitle) &&
      !isLikelyPlaceholderNowPlayingTitle(split.rawTitle) &&
      !isLikelyStationSlogan({
        value: split.rawTitle,
        stationName,
        streamUrl,
        homePageUrl,
      })
    ) {
      const coverUrl =
        split.artist && split.track && lastFmApiKey
          ? await resolveLastFmCover(split.artist, split.track, lastFmApiKey)
          : null
      return {
        rawTitle: split.rawTitle,
        artist: split.artist,
        track: split.track,
        coverUrl,
        sourceUrl: streamUrl,
      }
    }
  }

  const candidates = buildCandidates(streamUrl, homePageUrl)

  for (const candidate of candidates) {
    const response = await fetchTextViaDesktop(candidate.url)
    if (!response.ok || !response.text) continue

    let rawTitle: string | null = null
    if (candidate.parser === 'json') {
      rawTitle = extractTitleFromJson(response.text, { streamPath, streamUrl })
    }
    if (candidate.parser === 'text')
      rawTitle = extractTitleFromText(response.text)
    if (candidate.parser === 'html7')
      rawTitle = extractTitleFromHtml7(response.text)

    if (!rawTitle) continue
    rawTitle = tryFixMojibake(rawTitle)
    const split = splitArtistTrack(rawTitle)
    if (isLikelyGarbageTitle(split.rawTitle)) continue
    if (
      isLikelyStationSlogan({
        value: split.rawTitle,
        stationName,
        streamUrl,
        homePageUrl,
      })
    )
      continue
    const coverUrl =
      split.artist && split.track && lastFmApiKey
        ? await resolveLastFmCover(split.artist, split.track, lastFmApiKey)
        : null

    return {
      rawTitle: split.rawTitle,
      artist: split.artist,
      track: split.track,
      coverUrl,
      sourceUrl: candidate.url,
    }
  }

  return null
}

async function resolveLastFmCover(
  artist: string,
  track: string,
  apiKey: string,
) {
  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/')
    url.searchParams.set('method', 'track.getInfo')
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('format', 'json')
    url.searchParams.set(
      'artist',
      artist.includes('+') ? artist.replace(/\+/g, '%2B') : artist,
    )
    url.searchParams.set(
      'track',
      track.includes('+') ? track.replace(/\+/g, '%2B') : track,
    )
    url.searchParams.set('autocorrect', '1')

    const response = await fetch(url.toString())
    if (!response.ok) return null
    const data = (await response.json()) as {
      track?: { album?: { image?: Array<{ size?: string; '#text'?: string }> } }
    }
    const images = data?.track?.album?.image ?? []
    const preferred =
      images.find((img) => img.size === 'extralarge') ??
      images[images.length - 1]
    const value = preferred?.['#text']
    if (typeof value === 'string' && value.trim()) return value
  } catch {
    return null
  }
  return null
}

export async function findLibrarySongIdForRadioTrack(
  nowPlaying: Pick<RadioNowPlaying, 'artist' | 'track' | 'rawTitle'>,
) {
  const query = [nowPlaying.artist, nowPlaying.track, nowPlaying.rawTitle]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (!query) return null

  try {
    const result = await subsonic.search.get({
      query,
      artistCount: 0,
      albumCount: 0,
      songCount: 20,
      songOffset: 0,
    })
    const songs = result?.song ?? []
    if (songs.length === 0) return null

    const targetArtist = normalizeText(nowPlaying.artist ?? '')
    const targetTrack = normalizeText(nowPlaying.track ?? nowPlaying.rawTitle)

    let best = songs[0]
    let bestScore = -1
    for (const song of songs) {
      const artistScore =
        targetArtist && normalizeText(song.artist ?? '') === targetArtist
          ? 100
          : 0
      const titleNorm = normalizeText(song.title ?? '')
      const titleScore =
        titleNorm === targetTrack
          ? 120
          : titleNorm.includes(targetTrack) || targetTrack.includes(titleNorm)
            ? 40
            : 0
      const score = artistScore + titleScore
      if (score > bestScore) {
        best = song
        bestScore = score
      }
    }

    return bestScore >= 40 ? best.id : null
  } catch {
    return null
  }
}
