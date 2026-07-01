import merge from 'lodash/merge'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createWithEqualityFn } from 'zustand/traditional'
import { IThemeContext, Theme } from '@/types/themeContext'
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from '@/utils/safe-storage'
import {
  LAST_NON_SESSION_THEME_KEY,
  SESSION_PREVIOUS_THEME_KEY,
} from '@/utils/session-storage-keys'
import { getValidThemeFromEnv } from '@/utils/theme'

const appThemeFromEnv = getValidThemeFromEnv()
const VALID_THEMES = new Set(Object.values(Theme))
const SESSION_THEMES = new Set<Theme>([Theme.Black, Theme.NuclearDark])

const sanitizeTheme = (value: unknown): Theme =>
  VALID_THEMES.has(value as Theme) ? (value as Theme) : Theme.Reactive

export const useThemeStore = createWithEqualityFn<IThemeContext>()(
  subscribeWithSelector(
    persist(
      devtools(
        immer((set) => ({
          theme: sanitizeTheme(appThemeFromEnv || Theme.Reactive),
          setTheme: (theme: Theme) => {
            set((state) => {
              state.theme = theme
            })
            if (!SESSION_THEMES.has(theme))
              safeStorageSet(LAST_NON_SESSION_THEME_KEY, theme)
          },
        })),
        {
          name: 'theme_store',
        },
      ),
      {
        name: 'theme_store',
        version: 1,
        merge: (persistedState, currentState) => {
          if (appThemeFromEnv) {
            if (persistedState && typeof persistedState === 'object') {
              persistedState = {
                ...persistedState,
                theme: sanitizeTheme(appThemeFromEnv),
              }
            }
          }

          const merged = merge(currentState, persistedState)
          let resolvedTheme = sanitizeTheme((merged as IThemeContext).theme)

          // If the app boots in normal session mode but still has a temporary
          // session theme, restore the user's previous theme automatically.
          if (SESSION_THEMES.has(resolvedTheme)) {
            const previousTheme = safeStorageGet(SESSION_PREVIOUS_THEME_KEY)
            if (previousTheme && VALID_THEMES.has(previousTheme as Theme)) {
              resolvedTheme = previousTheme as Theme
              safeStorageRemove(SESSION_PREVIOUS_THEME_KEY)
            }
          }

          if (!SESSION_THEMES.has(resolvedTheme))
            safeStorageSet(LAST_NON_SESSION_THEME_KEY, resolvedTheme)

          return {
            ...merged,
            theme: resolvedTheme,
          }
        },
      },
    ),
  ),
)

export const useTheme = () => useThemeStore((state) => state)
