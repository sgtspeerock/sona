import { safeStorageGet, safeStorageSet } from '@/utils/safe-storage'

type MemorySong = {
  id: string
  artistId?: string
  artist?: string
  albumId?: string
  album?: string
}

type MemoryEntry = {
  songId: string
  artistKey: string
  albumKey: string
  playedAt: number
}

type SkipEntry = {
  songId: string
  artistKey: string
  albumKey: string
  skippedAt: number
}

const MEMORY_STORAGE_KEY = 'sona.listeningMemory.entries.v1'
const SKIP_STORAGE_KEY = 'sona.listeningMemory.skips.v1'
const MEMORY_ENABLED_KEY = 'sona.listeningMemory.enabled'
const MAX_ENTRIES = 800
const MAX_SKIP_ENTRIES = 600

function normalize(value?: string) {
  return (value ?? '').trim().toLowerCase()
}

function getArtistKey(song: MemorySong) {
  return song.artistId ?? normalize(song.artist) ?? `artist:${song.id}`
}

function getAlbumKey(song: MemorySong) {
  return song.albumId ?? normalize(song.album) ?? `album:${song.id}`
}

function loadEntries(): MemoryEntry[] {
  try {
    const raw = safeStorageGet(MEMORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MemoryEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        Boolean(item?.songId) &&
        Boolean(item?.artistKey) &&
        Boolean(item?.albumKey) &&
        typeof item?.playedAt === 'number',
    )
  } catch {
    return []
  }
}

function saveEntries(entries: MemoryEntry[]) {
  try {
    safeStorageSet(
      MEMORY_STORAGE_KEY,
      JSON.stringify(entries.slice(-MAX_ENTRIES)),
    )
  } catch {
    // Keep runtime resilient on storage failures.
  }
}

function loadSkips(): SkipEntry[] {
  try {
    const raw = safeStorageGet(SKIP_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SkipEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        Boolean(item?.songId) &&
        Boolean(item?.artistKey) &&
        Boolean(item?.albumKey) &&
        typeof item?.skippedAt === 'number',
    )
  } catch {
    return []
  }
}

function saveSkips(entries: SkipEntry[]) {
  try {
    safeStorageSet(
      SKIP_STORAGE_KEY,
      JSON.stringify(entries.slice(-MAX_SKIP_ENTRIES)),
    )
  } catch {
    // Keep runtime resilient on storage failures.
  }
}

export function getListeningMemoryEnabledPreference() {
  const value = safeStorageGet(MEMORY_ENABLED_KEY)
  if (value == null) return true
  return value === '1'
}

export function setListeningMemoryEnabledPreference(enabled: boolean) {
  safeStorageSet(MEMORY_ENABLED_KEY, enabled ? '1' : '0')
}

export function rememberSongPlayback(song: MemorySong | null | undefined) {
  if (!song?.id) return
  const now = Date.now()
  const entry: MemoryEntry = {
    songId: song.id,
    artistKey: getArtistKey(song),
    albumKey: getAlbumKey(song),
    playedAt: now,
  }

  const entries = loadEntries()
  const last = entries[entries.length - 1]
  if (last && last.songId === entry.songId && now - last.playedAt < 45_000)
    return

  entries.push(entry)
  saveEntries(entries)
}

export function rememberSongSkip(
  song: MemorySong | null | undefined,
  progressSeconds?: number,
  durationSeconds?: number,
) {
  if (!song?.id) return

  // Skip signal is useful only for meaningful "early-ish" skips.
  if (
    typeof durationSeconds === 'number' &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 45
  ) {
    const progress = Math.max(0, Number(progressSeconds ?? 0))
    const ratio = progress / durationSeconds
    const remaining = durationSeconds - progress

    // Ignore near-end transitions (manual next close to track end).
    if (ratio >= 0.85 || remaining <= 20) return
  }

  const now = Date.now()
  const entry: SkipEntry = {
    songId: song.id,
    artistKey: getArtistKey(song),
    albumKey: getAlbumKey(song),
    skippedAt: now,
  }

  const entries = loadSkips()
  const last = entries[entries.length - 1]
  if (last && last.songId === entry.songId && now - last.skippedAt < 30_000) {
    return
  }

  entries.push(entry)
  saveSkips(entries)
}

function scoreCandidate(
  song: MemorySong,
  entries: MemoryEntry[],
  skips: SkipEntry[],
  now: number,
) {
  const artistKey = getArtistKey(song)
  const albumKey = getAlbumKey(song)
  let score = 0

  for (const entry of entries) {
    const ageMs = now - entry.playedAt
    if (ageMs > 14 * 24 * 60 * 60 * 1000) continue

    if (entry.songId === song.id) {
      if (ageMs < 72 * 60 * 60 * 1000) score += 320
      else if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 180
      else score += 80
    }

    if (entry.artistKey === artistKey) {
      if (ageMs < 12 * 60 * 60 * 1000) score += 120
      else if (ageMs < 3 * 24 * 60 * 60 * 1000) score += 70
      else if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 35
    }

    if (entry.albumKey === albumKey) {
      if (ageMs < 24 * 60 * 60 * 1000) score += 90
      else if (ageMs < 4 * 24 * 60 * 60 * 1000) score += 45
      else if (ageMs < 10 * 24 * 60 * 60 * 1000) score += 20
    }
  }

  for (const skip of skips) {
    const ageMs = now - skip.skippedAt
    if (ageMs > 21 * 24 * 60 * 60 * 1000) continue

    if (skip.songId === song.id) {
      if (ageMs < 12 * 60 * 60 * 1000) score += 420
      else if (ageMs < 3 * 24 * 60 * 60 * 1000) score += 260
      else if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 140
      else score += 60
    }

    if (skip.artistKey === artistKey) {
      if (ageMs < 12 * 60 * 60 * 1000) score += 110
      else if (ageMs < 3 * 24 * 60 * 60 * 1000) score += 65
      else if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 35
    }

    if (skip.albumKey === albumKey) {
      if (ageMs < 12 * 60 * 60 * 1000) score += 90
      else if (ageMs < 3 * 24 * 60 * 60 * 1000) score += 50
      else if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 25
    }
  }

  return score
}

export function sortByListeningMemory<T extends MemorySong>(
  candidates: T[],
  enabled: boolean,
): T[] {
  if (!enabled || candidates.length <= 1) return candidates
  const entries = loadEntries()
  const skips = loadSkips()
  if (entries.length === 0 && skips.length === 0) return candidates
  const now = Date.now()

  return [...candidates]
    .map((song) => ({
      song,
      score: scoreCandidate(song, entries, skips, now) + Math.random() * 1.75,
    }))
    .sort((a, b) => a.score - b.score)
    .map((item) => item.song)
}

export function pickByListeningMemory<T extends MemorySong>(
  candidates: T[],
  enabled: boolean,
): T | undefined {
  return sortByListeningMemory(candidates, enabled)[0]
}
