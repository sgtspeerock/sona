import type { Song } from '@/types/responses/song'
import { logger } from '@/utils/logger'
import { generateDiscoverWeekly } from './discover-weekly'
import {
  readStoredJson,
  readStoredPlaylist,
  readStoredString,
  writeStoredPlaylist,
  writeStoredString,
} from './playlist-storage'

const STORAGE_KEY = 'discover_daily_playlist'
const STORAGE_KEY_METADATA = 'discover_daily_metadata'
const STORAGE_KEY_DAY_FLAG = 'discover_daily_current_day'

interface PlaylistMetadata {
  generatedAt: string
  artistsUsed: string[]
  totalSongs: number
  dayKey: string // Format: "2026-03-04"
}

interface DiscoverWeeklyConfig {
  username?: string
  apiKey?: string
  aiEnabled?: boolean
  aiApiKey?: string
  targetArtists?: number
  songsPerArtist?: number
}

let generationInFlight: Promise<{
  playlist: Song[]
  metadata: PlaylistMetadata
}> | null = null

function getDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function shouldGeneratePlaylist(): boolean {
  try {
    const currentDay = getDateKey(new Date())
    const storedDay = readStoredString(STORAGE_KEY_DAY_FLAG)
    const storedMetadata =
      readStoredJson<PlaylistMetadata>(STORAGE_KEY_METADATA)

    if (!storedMetadata) {
      logger.info('[DiscoverDaily] No playlist found, needs generation')
      return true
    }

    if (!storedDay) {
      const playlistDay =
        storedMetadata.dayKey ||
        getDateKey(new Date(storedMetadata.generatedAt))

      if (playlistDay !== currentDay) {
        logger.info(
          `[DiscoverDaily] Playlist from old day (${playlistDay}), needs regeneration`,
        )
        return true
      }

      writeStoredString(STORAGE_KEY_DAY_FLAG, playlistDay)
      return false
    }

    if (currentDay !== storedDay) {
      logger.info(
        `[DiscoverDaily] New day detected (${currentDay} vs ${storedDay}), needs regeneration`,
      )
      return true
    }

    logger.info(`[DiscoverDaily] Playlist for day ${currentDay} already exists`)
    return false
  } catch (error) {
    console.error('[DiscoverDaily] Error checking generation status:', error)
    return false
  }
}

export function loadPlaylist(): {
  playlist: Song[]
  metadata: PlaylistMetadata | null
} {
  try {
    const { playlist, metadata } = readStoredPlaylist<PlaylistMetadata>(
      STORAGE_KEY,
      STORAGE_KEY_METADATA,
    )
    if (metadata) {
      logger.info(
        `[DiscoverDaily] Loaded playlist from day ${metadata.dayKey || 'unknown'}`,
      )
      return { playlist, metadata }
    }

    return { playlist: [], metadata: null }
  } catch (error) {
    console.error('[DiscoverDaily] Failed to load playlist:', error)
    return { playlist: [], metadata: null }
  }
}

export async function generateAndSavePlaylist(
  config: DiscoverWeeklyConfig,
  force: boolean = false,
): Promise<{
  playlist: Song[]
  metadata: PlaylistMetadata
}> {
  if (generationInFlight) {
    return generationInFlight
  }

  generationInFlight = (async () => {
    const currentDay = getDateKey(new Date())

    if (!force && !shouldGeneratePlaylist()) {
      logger.info(
        '[DiscoverDaily] Generation not needed, loading existing playlist',
      )
      const { playlist, metadata } = loadPlaylist()
      if (metadata) {
        return { playlist, metadata }
      }
    }

    logger.info(`[DiscoverDaily] Generating playlist for day ${currentDay}...`)

    const result = await generateDiscoverWeekly({
      username: config.username,
      apiKey: config.apiKey,
      aiEnabled: config.aiEnabled,
      aiApiKey: config.aiApiKey,
      targetArtists: config.targetArtists || 50,
      songsPerArtist: config.songsPerArtist || 1,
    })

    const metadata: PlaylistMetadata = {
      ...result.metadata,
      dayKey: currentDay,
    }

    writeStoredPlaylist(
      STORAGE_KEY,
      STORAGE_KEY_METADATA,
      result.playlist,
      metadata,
    )
    writeStoredString(STORAGE_KEY_DAY_FLAG, currentDay)

    logger.info(
      `[DiscoverDaily] Playlist generated and saved for day ${currentDay}`,
    )

    return {
      playlist: result.playlist,
      metadata,
    }
  })()

  try {
    return await generationInFlight
  } finally {
    generationInFlight = null
  }
}

export async function checkAndCatchUp(
  config: DiscoverWeeklyConfig,
): Promise<boolean> {
  const isConfigured = config.aiEnabled ? !!config.aiApiKey : !!(config.username && config.apiKey)
  if (!isConfigured) {
    logger.info('[DiscoverDaily] Not configured, skipping catch-up')
    return false
  }

  const needsGeneration = shouldGeneratePlaylist()

  if (needsGeneration) {
    logger.info('[DiscoverDaily] Catch-up generation needed, generating now...')
    try {
      await generateAndSavePlaylist(config, false)
      return true
    } catch (error) {
      console.error('[DiscoverDaily] Catch-up generation failed:', error)
      return false
    }
  }

  return false
}

export function getMillisecondsUntilNextMidnight(): number {
  const now = new Date()
  const nextMidnight = new Date(now)
  nextMidnight.setDate(now.getDate() + 1)
  nextMidnight.setHours(0, 0, 0, 0)
  return nextMidnight.getTime() - now.getTime()
}

export function startDailyScheduler(
  config: DiscoverWeeklyConfig,
  onGenerate?: (success: boolean) => void,
): () => void {
  let timeoutId: NodeJS.Timeout | null = null

  const scheduleNext = () => {
    const msUntilMidnight = getMillisecondsUntilNextMidnight()
    const hoursUntilMidnight = (msUntilMidnight / (1000 * 60 * 60)).toFixed(1)

    logger.info(
      `[DiscoverDaily] Next generation scheduled in ${hoursUntilMidnight} hours`,
    )

    timeoutId = setTimeout(async () => {
      if (shouldGeneratePlaylist()) {
        logger.info('[DiscoverDaily] Midnight arrived. Generating playlist...')
        try {
          await generateAndSavePlaylist(config)
          onGenerate?.(true)
        } catch (error) {
          console.error('[DiscoverDaily] Scheduled generation failed:', error)
          onGenerate?.(false)
        }
      }

      scheduleNext()
    }, msUntilMidnight)
  }

  scheduleNext()

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      logger.info('[DiscoverDaily] Scheduler stopped')
    }
  }
}
