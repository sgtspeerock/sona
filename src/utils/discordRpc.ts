import { useAppStore } from '@/store/app.store'
import { usePlayerStore } from '@/store/player.store'
import { useRadioNowPlayingStore } from '@/store/radio-now-playing.store'
import { Radio } from '@/types/responses/radios'
import { ISong } from '@/types/responses/song'
import { isDesktop } from './desktop'

async function fetchLastFmCoverArt(
  artist: string,
  album: string,
  apiKey: string,
): Promise<string | null> {
  if (!apiKey || !artist || !album) return null

  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/')
    url.searchParams.set('method', 'album.getinfo')
    url.searchParams.set(
      'artist',
      artist.includes('+') ? artist.replace(/\+/g, '%2B') : artist,
    )
    url.searchParams.set(
      'album',
      album.includes('+') ? album.replace(/\+/g, '%2B') : album,
    )
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('format', 'json')

    const response = await fetch(url.toString())
    if (!response.ok) return null

    const data = await response.json()

    // Last.fm gibt Bilder in verschiedenen Größen zurück, wir nehmen 'extralarge'
    const images: Array<{ '#text': string; size: string }> =
      data.album?.image ?? []

    const image =
      images.find((i) => i.size === 'extralarge') ||
      images.find((i) => i.size === 'large')

    const imageUrl = image?.['#text']

    // Last.fm gibt manchmal leere Strings zurück
    return imageUrl && imageUrl.length > 0 ? imageUrl : null
  } catch {
    return null
  }
}

async function send(song: ISong, currentTime = 0, duration = 0) {
  if (!isDesktop()) return

  const { rpcEnabled } = useAppStore.getState().accounts.discord
  if (!rpcEnabled) return

  const currentTimeInMs = currentTime * 1000
  const durationInMs = duration * 1000

  const artist = song.artists
    ? song.artists.map((artist) => artist.name).join(', ')
    : song.artist

  const startTime = Math.floor(Date.now() - currentTimeInMs)
  const endTime = Math.floor(Date.now() - currentTimeInMs + durationInMs)

  const { apiKey } = useAppStore.getState().integrations.lastfm
  const coverArtUrl = await fetchLastFmCoverArt(artist, song.album, apiKey)

  window.api.setDiscordRpcActivity({
    trackName: song.title,
    albumName: song.album,
    artist,
    startTime,
    endTime,
    duration,
    coverArtUrl: coverArtUrl ?? undefined,
  })
}

function clear() {
  if (!isDesktop()) return

  window.api.clearDiscordRpcActivity()
}

function isLikelyStationFallbackCover(url: string) {
  return /\/favicon\.ico($|\?)/i.test(url)
}

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local')) return true
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    if (host.startsWith('10.')) return true
    if (host.startsWith('192.168.')) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true
    if (host.startsWith('127.')) return true
  }
  return false
}

function isRpcSafeCoverUrl(urlLike: string | null | undefined) {
  if (!urlLike) return false
  if (isLikelyStationFallbackCover(urlLike)) return false
  try {
    const parsed = new URL(urlLike)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    if (isPrivateHost(parsed.hostname)) return false
    return true
  } catch {
    return false
  }
}

function normalizeForCompare(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function looksLikeTrackMetadata(
  radio: Radio,
  nowPlaying?: {
    artist: string | null
    track: string | null
    rawTitle: string
    coverUrl: string | null
  },
) {
  if (!nowPlaying) return false
  if (nowPlaying.artist && nowPlaying.track) return true
  if (!nowPlaying.rawTitle) return false

  const raw = normalizeForCompare(nowPlaying.rawTitle)
  const station = normalizeForCompare(radio.name)
  if (!raw) return false
  if (station && (raw === station || raw.includes(station))) return false
  if (!/.+\s[-–—|~]\s.+/.test(nowPlaying.rawTitle)) return false
  return true
}

function sendRadio(
  radio: Radio,
  nowPlaying?: {
    artist: string | null
    track: string | null
    rawTitle: string
    coverUrl: string | null
  },
) {
  if (!isDesktop()) return

  const { rpcEnabled } = useAppStore.getState().accounts.discord
  if (!rpcEnabled) return

  const hasTrackMetadata = looksLikeTrackMetadata(radio, nowPlaying)
  const trackName = hasTrackMetadata
    ? nowPlaying?.track || nowPlaying?.rawTitle || `${radio.name} Live`
    : `${radio.name} Live`
  const artist = hasTrackMetadata
    ? nowPlaying?.artist || radio.name
    : radio.name
  const coverArtUrl = isRpcSafeCoverUrl(nowPlaying?.coverUrl)
    ? nowPlaying?.coverUrl
    : undefined
  const now = Date.now()
  const duration = 3600

  window.api.setDiscordRpcActivity({
    trackName,
    albumName: radio.name,
    artist,
    startTime: Math.floor(now),
    endTime: Math.floor(now + duration * 1000),
    duration,
    coverArtUrl,
  })
}

function sendCurrentSong() {
  if (!isDesktop()) return

  const { playerState, songlist, actions } = usePlayerStore.getState()
  const radioNowPlaying = useRadioNowPlayingStore.getState().current

  const { mediaType } = playerState
  if (mediaType === 'radio') {
    const radio = songlist.radioList[songlist.currentSongIndex]
    const { isPlaying } = playerState
    if (!radio || !isPlaying) {
      discordRpc.clear()
      return
    }

    const nowPlayingForRadio =
      radioNowPlaying?.radioId === radio.id
        ? {
            artist: radioNowPlaying.artist,
            track: radioNowPlaying.track,
            rawTitle: radioNowPlaying.rawTitle,
            coverUrl: radioNowPlaying.coverUrl,
          }
        : undefined

    sendRadio(radio, nowPlayingForRadio)
    return
  }

  if (mediaType !== 'song') return

  const { currentSong } = songlist
  const currentTime = actions.getCurrentProgress()
  const { isPlaying, currentDuration } = playerState

  // Clear activity if paused or there is no song
  if (!currentSong || !isPlaying) discordRpc.clear()

  if (currentSong && isPlaying) {
    discordRpc.send(currentSong, currentTime, currentDuration)
  }
}

export const discordRpc = {
  send,
  sendRadio,
  clear,
  sendCurrentSong,
}
