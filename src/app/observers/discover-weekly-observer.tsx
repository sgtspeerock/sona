import { useEffect } from 'react'
import { usePlaylistDialog } from '@/app/context/playlist-dialog-context'
import { checkAndCatchUp } from '@/service/discover-weekly-manager'
import { useAppIntegrations } from '@/store/app.store'
import { useAISettings } from '@/store/player.store'
import { runWithRetry } from '@/utils/background-task-runner'
import { isDesktop } from '@/utils/desktop'
import { logger } from '@/utils/logger'

/**
 * Observer component that listens to Electron IPC events
 * for Discover Weekly scheduler notifications
 *
 * Note: This observer only handles scheduled events from Electron Main Process.
 * It does NOT perform catch-up on mount (the hook handles that).
 */
export function DiscoverWeeklyObserver() {
  const { lastfm } = useAppIntegrations()
  const { enabled: aiEnabled, apiKey: aiApiKey } = useAISettings()
  const { showPlaylistSaved } = usePlaylistDialog()

  useEffect(() => {
    // Only run in Electron desktop app
    if (!isDesktop()) return

    const handleScheduleEvent = async (
      _event: unknown,
      data: {
        event: 'check' | 'daily-trigger'
        timestamp: string
        dayKey: string
      },
    ) => {
      logger.info(
        '[DiscoverWeekly Observer] Received event:',
        data.event,
        data.dayKey,
      )

      // Check configuration
      const isConfigured = aiEnabled ? !!aiApiKey : !!(lastfm.username && lastfm.apiKey)
      if (!isConfigured) {
        logger.info(
          '[DiscoverWeekly Observer] Neither AI nor Last.fm is configured, skipping',
        )
        return
      }
      // Only handle scheduled trigger events, skip 'check' events
      // The hook handles catch-up on mount to avoid conflicts
      if (data.event === 'check') {
        logger.info(
          '[DiscoverWeekly Observer] Ignoring check event (hook handles catch-up)',
        )
        return
      }

      try {
        const wasGenerated = await runWithRetry(
          () =>
            checkAndCatchUp({
              username: lastfm.username,
              apiKey: lastfm.apiKey,
              aiEnabled,
              aiApiKey,
              targetArtists: 50,
              songsPerArtist: 1,
            }),
          {
            taskName: 'discover-weekly-catchup',
            policy: {
              retries: 2,
              baseDelayMs: 800,
              maxDelayMs: 6000,
            },
            onRetry: ({ attempt, delayMs }) => {
              console.warn(
                `[DiscoverWeekly Observer] Retry ${attempt} in ${delayMs}ms`,
              )
            },
          },
        )

        if (wasGenerated) {
          logger.info(
            '[DiscoverWeekly Observer] Playlist generated successfully',
          )

          // Show modal instead of system notification
          showPlaylistSaved('Discover Daily', 50)
        } else {
          logger.info('[DiscoverWeekly Observer] No generation needed')
        }
      } catch (error) {
        console.error('[DiscoverWeekly Observer] Generation failed:', error)
      }
    }

    // Register IPC listener
    const removeListener = window.electron?.ipcRenderer?.on(
      'discover-weekly:schedule-event',
      handleScheduleEvent,
    )

    // Cleanup on unmount
    return () => {
      if (removeListener) {
        removeListener()
      }
    }
  }, [lastfm.username, lastfm.apiKey, aiEnabled, aiApiKey, showPlaylistSaved])

  // This is an observer component, it doesn't render anything
  return null
}
