import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkAndCatchUp,
  generateAndSavePlaylist,
  loadPlaylist,
  shouldGeneratePlaylist,
} from '@/service/discover-weekly-manager'
import { useAppIntegrations } from '@/store/app.store'
import { useAISettings } from '@/store/player.store'
import type { Song } from '@/types/responses/song'
import { logger } from '@/utils/logger'

interface PlaylistMetadata {
  generatedAt: string
  artistsUsed: string[]
  totalSongs: number
  dayKey: string
}

export function useDiscoverWeekly() {
  const { lastfm } = useAppIntegrations()
  const { enabled: aiEnabled, apiKey: aiApiKey } = useAISettings()
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<PlaylistMetadata | null>(null)
  const hasCheckedCatchupRef = useRef(false)
  const hasLoadedRef = useRef(false)

  const isConfigured = aiEnabled ? !!aiApiKey : !!(lastfm.username && lastfm.apiKey)

  // Load playlist from localStorage on mount
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    // Use setTimeout to make this async
    setTimeout(() => {
      const startedAt = performance.now()
      try {
        const { playlist: storedPlaylist, metadata: storedMetadata } =
          loadPlaylist()

        if (storedPlaylist.length > 0 && storedMetadata) {
          setPlaylist(storedPlaylist)
          setMetadata(storedMetadata)
        }
        logger.info('[Perf][DiscoverDaily] Loaded from storage', {
          elapsedMs: Math.round(performance.now() - startedAt),
          songs: storedPlaylist.length,
        })
      } catch (error) {
        console.error('[DiscoverWeekly Hook] Failed to load playlist:', error)
      }
    }, 0)
  }, [])

  // Catch-up check on mount (only once per session)
  useEffect(() => {
    if (!isConfigured || hasCheckedCatchupRef.current) {
      return
    }

    const performCatchup = async () => {
      // Mark as checked (using ref to avoid re-renders)
      hasCheckedCatchupRef.current = true

      // Check if generation is needed
      if (!shouldGeneratePlaylist()) {
        logger.info('[DiscoverWeekly Hook] No catch-up needed')
        return
      }

      logger.info('[DiscoverWeekly Hook] Performing catch-up generation...')
      setIsGenerating(true)
      setError(null)
      const startedAt = performance.now()

      try {
        const success = await checkAndCatchUp({
          username: lastfm.username,
          apiKey: lastfm.apiKey,
          aiEnabled,
          aiApiKey,
          targetArtists: 50, // CHANGED: 50 artists
          songsPerArtist: 1, // CHANGED: 1 song per artist
        })

        if (success) {
          // Reload playlist after generation
          const { playlist: newPlaylist, metadata: newMetadata } =
            loadPlaylist()
          setPlaylist(newPlaylist)
          setMetadata(newMetadata)
        }
        logger.info('[Perf][DiscoverDaily] Catch-up finished', {
          elapsedMs: Math.round(performance.now() - startedAt),
          generated: success,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Catch-up failed'
        setError(message)
        console.error('[DiscoverWeekly Hook] Catch-up error:', error)
      } finally {
        setIsGenerating(false)
      }
    }

    // Delay by 2 seconds to not block initial render
    const timeoutId = setTimeout(performCatchup, 2000)
    return () => clearTimeout(timeoutId)
  }, [isConfigured, lastfm.username, lastfm.apiKey, aiEnabled, aiApiKey])

  // Manual generation (force=true)
  const generate = useCallback(async () => {
    if (!isConfigured) {
      setError('Last.fm not configured')
      return
    }

    setIsGenerating(true)
    setError(null)
    const startedAt = performance.now()

    try {
      const result = await generateAndSavePlaylist(
        {
          username: lastfm.username,
          apiKey: lastfm.apiKey,
          aiEnabled,
          aiApiKey,
          targetArtists: 50, // CHANGED: 50 artists
          songsPerArtist: 1, // CHANGED: 1 song per artist
        },
        true, // Force regeneration
      )

      setPlaylist(result.playlist)
      setMetadata(result.metadata)
      logger.info('[Perf][DiscoverDaily] Manual generation finished', {
        elapsedMs: Math.round(performance.now() - startedAt),
        songs: result.playlist.length,
        artists: result.metadata.artistsUsed.length,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Generation failed'
      setError(message)
      console.error('[DiscoverWeekly Hook] Manual generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [isConfigured, lastfm.username, lastfm.apiKey, aiEnabled, aiApiKey])

  return {
    playlist,
    isGenerating,
    error,
    lastGenerated: metadata?.generatedAt || null,
    artistsUsed: metadata?.artistsUsed || [],
    dayKey: metadata?.dayKey || null,
    generate,
    isConfigured,
  }
}
