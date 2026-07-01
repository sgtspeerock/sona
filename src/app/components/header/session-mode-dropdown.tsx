import { MoonStar, Sparkles, Target } from 'lucide-react'
import { startTransition, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { usePlayerActions, useSessionModeSettings } from '@/store/player.store'
import { useTheme } from '@/store/theme.store'
import { useFullscreenState } from '@/store/ui.store'
import { SessionMode } from '@/types/playerContext'
import { SESSION_MODE_THEMES } from '@/types/sessionMode'
import { Theme } from '@/types/themeContext'
import { safeStorageGet, safeStorageSet } from '@/utils/safe-storage'
import {
  FULLSCREEN_HYPNOTIC_BACKDROP_KEY,
  LAST_NON_SESSION_THEME_KEY,
  SESSION_PREVIOUS_THEME_KEY,
} from '@/utils/session-storage-keys'

type ModeId = SessionMode

const SESSION_MODE_TRANSITION_MS = 420

let sessionModeTransitionTimer: ReturnType<typeof setTimeout> | null = null

function openInAppFullscreen(setFullscreenOpen: (open: boolean) => void) {
  startTransition(() => {
    setFullscreenOpen(true)
  })
}

function triggerSessionModeTransition() {
  if (typeof window === 'undefined') return
  const root = window.document.documentElement
  root.classList.add('session-mode-transition')

  if (sessionModeTransitionTimer) {
    clearTimeout(sessionModeTransitionTimer)
  }

  sessionModeTransitionTimer = setTimeout(() => {
    root.classList.remove('session-mode-transition')
    sessionModeTransitionTimer = null
  }, SESSION_MODE_TRANSITION_MS)
}

function getStoredTheme(): Theme | null {
  const value = safeStorageGet(SESSION_PREVIOUS_THEME_KEY)
  if (!value) return null
  return Object.values(Theme).includes(value as Theme) ? (value as Theme) : null
}

function getLastNonSessionTheme(): Theme | null {
  const value = safeStorageGet(LAST_NON_SESSION_THEME_KEY)
  if (!value) return null
  return Object.values(Theme).includes(value as Theme) ? (value as Theme) : null
}

export function SessionModeDropdown() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { startSessionMode } = usePlayerActions()
  const { mode } = useSessionModeSettings()
  const { theme, setTheme } = useTheme()
  const { setOpen: setFullscreenOpen } = useFullscreenState()
  const isActive = mode !== 'off'

  const statusLabel = useMemo(() => {
    if (mode === 'focus') return t('sessionMode.focus.label', 'Focus')
    if (mode === 'night') return t('sessionMode.night.label', 'Night')
    return t('sessionMode.normal.label', 'Normal')
  }, [mode, t])

  const StatusIcon =
    mode === 'focus' ? Target : mode === 'night' ? MoonStar : Sparkles

  const selectMode = (selected: ModeId) => {
    triggerSessionModeTransition()
    const previousMode = mode
    if (selected === 'off') {
      const previousTheme = getStoredTheme()
      const fallbackTheme = getLastNonSessionTheme()
      startTransition(() => {
        setTheme(previousTheme ?? fallbackTheme ?? theme ?? Theme.Reactive)
      })
      if (mode === 'focus') {
        const closeButton = document.querySelector(
          '[data-testid=\"fullscreen-close-button\"]',
        ) as HTMLButtonElement | null
        closeButton?.click()
      }
      safeStorageSet(FULLSCREEN_HYPNOTIC_BACKDROP_KEY, 'false')
      startTransition(() => {
        startSessionMode('off').catch(() => undefined)
      })
      return
    }

    if (mode === 'off') safeStorageSet(SESSION_PREVIOUS_THEME_KEY, theme)

    startTransition(() => {
      setTheme(SESSION_MODE_THEMES[selected])
    })
    if (selected === 'focus') {
      openInAppFullscreen(setFullscreenOpen)
      safeStorageSet(FULLSCREEN_HYPNOTIC_BACKDROP_KEY, 'false')
    }
    if (selected === 'night')
      safeStorageSet(FULLSCREEN_HYPNOTIC_BACKDROP_KEY, 'true')
    startTransition(() => {
      startSessionMode(selected).catch(() => undefined)
    })
    if (selected !== previousMode) {
      toast.info(
        selected === 'focus'
          ? t('sessionMode.toasts.focusEnabled', 'Focus Mode enabled')
          : t('sessionMode.toasts.nightEnabled', 'Night Mode enabled'),
      )
    }
  }

  const disableCurrentMode = () => {
    selectMode('off')
    toast.info(
      mode === 'focus'
        ? t('sessionMode.toasts.focusDisabled', 'Focus Mode disabled')
        : t('sessionMode.toasts.nightDisabled', 'Night Mode disabled'),
    )
  }

  const modeCardClass = (target: ModeId) => {
    const active = mode === target
    if (active) {
      return 'border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]'
    }
    return 'border-border bg-card/50 hover:border-primary/40 hover:bg-card'
  }

  const closeModalSafely = () => {
    const activeElement = document.activeElement as HTMLElement | null
    activeElement?.blur()
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        data-coach-id="session-mode"
        onClick={() => {
          if (isActive) {
            disableCurrentMode()
            return
          }
          setOpen(true)
        }}
        className={`h-8 gap-1.5 rounded-md px-2 transition-all ${
          isActive
            ? 'border border-primary/50 bg-primary/14 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.22)]'
            : 'text-muted-foreground'
        }`}
      >
        <StatusIcon className="h-4 w-4" />
        {isActive && (
          <>
            <span className="text-[11px] font-semibold tracking-wide uppercase">
              {statusLabel}
            </span>
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('sessionMode.label', 'Session Mode')}</DialogTitle>
            <DialogDescription>
              {t(
                'sessionMode.description',
                'Switch playback mood and visuals in one click.',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              className={`rounded-lg border p-4 text-left transition-colors ${modeCardClass('focus')}`}
              onClick={() => {
                selectMode('focus')
                closeModalSafely()
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="font-medium">
                  {t('sessionMode.focus.label', 'Focus')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('sessionMode.focus.info', 'Calm, low-distraction flow')}
              </p>
            </button>

            <button
              type="button"
              className={`rounded-lg border p-4 text-left transition-colors ${modeCardClass('night')}`}
              onClick={() => {
                selectMode('night')
                closeModalSafely()
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <MoonStar className="h-4 w-4" />
                <span className="font-medium">
                  {t('sessionMode.night.label', 'Night')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('sessionMode.night.info', 'Atmospheric late-hour rotation')}
              </p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
