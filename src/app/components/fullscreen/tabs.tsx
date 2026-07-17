import { clsx } from 'clsx'
import { Minimize2 } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/app/components/ui/button'
import { usePlayerActions, useSessionModeSettings } from '@/store/player.store'
import { useTheme } from '@/store/theme.store'
import { Theme } from '@/types/themeContext'
import { safeStorageGet, safeStorageSet } from '@/utils/safe-storage'
import {
  FULLSCREEN_HYPNOTIC_BACKDROP_KEY,
  SESSION_PREVIOUS_THEME_KEY,
} from '@/utils/session-storage-keys'
import { useFullscreenState } from '@/store/ui.store'
import { SongInfo } from './song-info'

const MemoSongInfo = memo(SongInfo)

function getStoredTheme(): Theme | null {
  const value = safeStorageGet(SESSION_PREVIOUS_THEME_KEY)
  if (!value) return null
  return Object.values(Theme).includes(value as Theme) ? (value as Theme) : null
}

interface FullscreenTabsProps {
  isChromeVisible: boolean
  isPanelOpen: boolean
}

export function FullscreenTabs({
  isChromeVisible,
  isPanelOpen,
}: FullscreenTabsProps) {
  const { t } = useTranslation()
  const { mode } = useSessionModeSettings()
  const { startSessionMode } = usePlayerActions()
  const { setTheme } = useTheme()
  const { setOpen: setFullscreenOpen } = useFullscreenState()
  const isFocusMode = mode === 'focus'

  const exitFocusMode = () => {
    const previousTheme = getStoredTheme()
    setTheme(previousTheme ?? Theme.Reactive)
    safeStorageSet(FULLSCREEN_HYPNOTIC_BACKDROP_KEY, 'false')
    startSessionMode('off').catch(() => undefined)
    setFullscreenOpen(false)
  }

  return (
    <div className="w-full h-full min-h-full">
      {isFocusMode && (
        <div
          className={clsx(
            'absolute left-6 z-40 transition-[opacity,transform] duration-300',
            !isChromeVisible && 'opacity-0 -translate-y-2 pointer-events-none',
          )}
          style={{ top: 'calc(var(--header-height, 48px) + 24px)' }}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exitFocusMode}
            className="rounded-full border-primary/35 bg-background/35 px-3 hover:bg-background/45 h-8"
          >
            <Minimize2 className="mr-1 h-4 w-4" />
            {t('sessionMode.focus.exit', 'Exit Focus Mode')}
          </Button>
        </div>
      )}

      <div className="relative w-full h-full">
        <div
          className={clsx(
            'absolute inset-0 mt-0 h-full overflow-visible transition-[opacity,transform] duration-320 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
            isPanelOpen
              ? 'opacity-0 translate-y-1 pointer-events-none'
              : 'opacity-100 translate-y-0',
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <MemoSongInfo
            isPanelOpen={isPanelOpen}
            isChromeVisible={isChromeVisible}
          />
        </div>
      </div>
    </div>
  )
}
