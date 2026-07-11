import { useLayoutEffect } from 'react'
import { usePlayerCurrentSong, useSongColor } from '@/store/player.store'
import { useTheme } from '@/store/theme.store'
import { useFullscreenState } from '@/store/ui.store'
import { Theme } from '@/types/themeContext'
import { setDesktopTitleBarColors } from '@/utils/theme'

export const appThemes: Theme[] = Object.values(Theme)

const legacyThemes = [
  'one-dark',
  'marmalade-beaver',
  'monokai-pro',
  'github-dark',
  'achiever',
  'dracula',
  'tinacious-design',
  'vue-dark',
]

const REACTIVE_TRANSITION_CLASS = 'reactive-theme-transition'

function hexToHsl(hex: string) {
  const cleaned = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null

  const red = parseInt(cleaned.slice(0, 2), 16) / 255
  const green = parseInt(cleaned.slice(2, 4), 16) / 255
  const blue = parseInt(cleaned.slice(4, 6), 16) / 255

  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let hue = 0
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6
    else if (max === green) hue = (blue - red) / delta + 2
    else hue = (red - green) / delta + 4
  }

  hue = Math.round(hue * 60)
  if (hue < 0) hue += 360

  const lightness = (max + min) / 2
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))

  return {
    h: Math.round(hue),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  }
}

function toHslToken(h: number, s: number, l: number) {
  return `${h} ${s}% ${l}%`
}

function getReadableForegroundToken(lightness: number) {
  return lightness >= 58 ? '222 47% 11%' : '210 40% 98%'
}

function applyReactiveThemeColors(
  root: HTMLElement,
  baseHex: string | null | undefined,
) {
  const parsed = baseHex ? hexToHsl(baseHex) : null

  if (!parsed) {
    root.style.removeProperty('--primary')
    root.style.removeProperty('--primary-foreground')
    root.style.removeProperty('--accent-foreground')
    root.style.removeProperty('--sidebar-primary-foreground')
    root.style.removeProperty('--sidebar-accent-foreground')
    root.style.removeProperty('--accent')
    root.style.removeProperty('--secondary')
    root.style.removeProperty('--ring')
    return
  }

  const token = toHslToken(parsed.h, parsed.s, parsed.l)
  const foregroundToken = getReadableForegroundToken(parsed.l)
  root.style.setProperty('--primary', token)
  root.style.setProperty('--primary-foreground', foregroundToken)
  root.style.setProperty('--accent-foreground', foregroundToken)
  root.style.setProperty('--sidebar-primary-foreground', foregroundToken)
  root.style.setProperty('--sidebar-accent-foreground', foregroundToken)
  root.style.setProperty('--ring', token)
}

function applyReactivePaletteColors(
  root: HTMLElement,
  palette: {
    dominant: string
    vibrant: string
    muted: string
    accent: string
  } | null,
) {
  if (!palette) {
    root.style.removeProperty('--accent')
    root.style.removeProperty('--secondary')
    applyReactiveThemeColors(root, null)
    return
  }

  const primaryHex = palette.vibrant || palette.dominant
  const primaryHsl = primaryHex ? hexToHsl(primaryHex) : null

  applyReactiveThemeColors(root, primaryHex)

  // Reactive should use one main color everywhere (primary/accent/secondary).
  if (primaryHsl) {
    const token = toHslToken(primaryHsl.h, primaryHsl.s, primaryHsl.l)
    root.style.setProperty('--accent', token)
    root.style.setProperty('--secondary', '220 7% 22%')
  } else {
    root.style.removeProperty('--accent')
    root.style.removeProperty('--secondary')
  }
}

export function ThemeObserver() {
  const { theme } = useTheme()
  const fullscreenOpen = useFullscreenState((state) => state.open)
  const currentSong = usePlayerCurrentSong()
  const { currentSongColor, currentSongColorPalette } = useSongColor()

  useLayoutEffect(() => {
    const root = window.document.documentElement

    root.classList.remove(...appThemes, ...legacyThemes)
    root.classList.add(theme)

    if (theme === Theme.Reactive) {
      const reactivePalette = currentSong?.id ? currentSongColorPalette : null
      const reactiveColor = currentSong?.id ? currentSongColor : null

      root.classList.add(REACTIVE_TRANSITION_CLASS)
      if (reactivePalette) {
        applyReactivePaletteColors(root, reactivePalette)
      } else {
        applyReactivePaletteColors(root, null)
        applyReactiveThemeColors(root, reactiveColor)
      }

      window.setTimeout(() => {
        root.classList.remove(REACTIVE_TRANSITION_CLASS)
      }, 2100)
    } else {
      root.classList.remove(REACTIVE_TRANSITION_CLASS)
      applyReactivePaletteColors(root, null)
      applyReactiveThemeColors(root, null)
    }

    setDesktopTitleBarColors(fullscreenOpen)
  }, [
    theme,
    fullscreenOpen,
    currentSong?.id,
    currentSongColor,
    currentSongColorPalette,
  ])

  return null
}
