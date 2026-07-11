import { is } from '@electron-toolkit/utils'
import { BrowserWindow, ipcMain, nativeTheme, session, shell } from 'electron'
import { electron } from '../../../package.json'
import {
  IpcChannels,
  OverlayColors,
  PlayerStatePayload,
} from '../../preload/types'
import { tray, updateTray } from '../tray'
import { colorsState } from './colors'
import {
  clearDiscordRpcActivity,
  RpcPayload,
  setDiscordRpcActivity,
} from './discordRpc'
import { playerState } from './playerState'
import { getAppSetting, ISettingPayload, saveAppSettings } from './settings'
import { setTaskbarButtons } from './taskbar'
import {
  getStoredMainBounds,
  getStoredMainIsMaximized,
  getStoredMiniBounds,
  setStoredMainBounds,
  setStoredMainIsMaximized,
  setStoredMiniBounds,
} from './windowModeState'

export function setupEvents(window: BrowserWindow | null) {
  if (!window) return

  window.on('ready-to-show', async () => {
    window.show()
  })

  window.on('show', () => {
    setTaskbarButtons()
    updateTray()
  })

  window.on('hide', () => {
    updateTray()
  })

  window.webContents.once('did-finish-load', () => {
    nativeTheme.on('updated', () => {
      setTaskbarButtons()
    })
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  window.on('enter-full-screen', () => {
    window.webContents.send(IpcChannels.FullscreenStatus, true)
  })

  window.on('leave-full-screen', () => {
    window.webContents.send(IpcChannels.FullscreenStatus, false)
  })

  window.on('maximize', () => {
    window.webContents.send(IpcChannels.MaximizedStatus, true)
  })

  window.on('unmaximize', () => {
    window.webContents.send(IpcChannels.MaximizedStatus, false)
  })

  window.on('close', (event) => {
    if (is.dev || !getAppSetting('minimizeToTray')) {
      if (tray && !tray.isDestroyed()) tray.destroy()
      return
    }

    event.preventDefault()
    window.hide()
  })

  window.on('page-title-updated', (_, title) => {
    updateTray(title)
  })
}

export function setupIpcEvents(window: BrowserWindow | null) {
  if (!window) return

  ipcMain.removeAllListeners()
  const { defaultWidth, defaultHeight } = electron.window
  const mainMinWidth = Math.max(defaultWidth, 1300)
  const miniWidth = 384
  const miniHeight = 192

  let miniPlayerPrevBounds = window.getBounds()
  let miniPlayerPrevMaximized = window.isMaximized()
  let miniPlayerPrevMinimizable = window.isMinimizable()
  let miniPlayerPrevMaximizable = window.isMaximizable()
  let miniPlayerPrevResizable = window.isResizable()
  let miniPlayerPrevClosable = window.isClosable()
  let miniPlayerPrevFullScreenable = window.isFullScreenable()
  let miniPlayerLastBounds: Electron.Rectangle | null = null
  let restoreMouseEventsTimer: ReturnType<typeof setTimeout> | null = null
  let isMiniPlayerMode = false

  window.on('close', () => {
    if (isMiniPlayerMode) {
      setStoredMiniBounds(window.getBounds())
      return
    }

    const mainBounds = window.isMaximized()
      ? window.getNormalBounds()
      : window.getBounds()
    setStoredMainBounds(mainBounds)
    setStoredMainIsMaximized(window.isMaximized())
  })

  ipcMain.on(IpcChannels.ToggleFullscreen, (_, isFullscreen: boolean) => {
    window.setFullScreen(isFullscreen)
  })

  ipcMain.removeHandler(IpcChannels.IsFullScreen)
  ipcMain.handle(IpcChannels.IsFullScreen, () => {
    return window.isFullScreen()
  })

  ipcMain.removeHandler(IpcChannels.IsMaximized)
  ipcMain.handle(IpcChannels.IsMaximized, () => {
    return window.isMaximized()
  })

  ipcMain.removeHandler(IpcChannels.ClearAppCache)
  ipcMain.handle(IpcChannels.ClearAppCache, async () => {
    try {
      await session.defaultSession.clearCache()
      return true
    } catch {
      return false
    }
  })

  ipcMain.removeHandler(IpcChannels.FetchExternalText)
  ipcMain.handle(
    IpcChannels.FetchExternalText,
    async (_, rawUrl: string, customHeaders?: Record<string, string>) => {
      try {
        const url = String(rawUrl ?? '').trim()
        if (!url) {
          return { ok: false, status: 400, text: '', finalUrl: '' }
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Sona/RadioMetadata',
            'Icy-MetaData': '1',
            Accept: 'application/json,text/plain,text/html,*/*',
            ...(customHeaders || {}),
          },
        redirect: 'follow',
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const text = await response.text()
      const capped = text.length > 250_000 ? text.slice(0, 250_000) : text

      return {
        ok: response.ok,
        status: response.status,
        text: capped,
        finalUrl: response.url,
      }
    } catch {
      return { ok: false, status: 0, text: '', finalUrl: '' }
    }
  })

  ipcMain.removeHandler(IpcChannels.FetchIcyMetadata)
  ipcMain.handle(IpcChannels.FetchIcyMetadata, async (_, rawUrl: string) => {
    const extractTitle = (text: string) => {
      const match = text.match(/StreamTitle='([^']*)'|StreamTitle="([^"]*)"/i)
      const title = match?.[1]?.trim() ?? match?.[2]?.trim() ?? ''
      return title || null
    }

    const titleQualityScore = (title: string) => {
      const t = title.trim()
      if (!t) return -1000
      const replacementCount = (t.match(/�/g) ?? []).length
      const alnumCount = (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]/g) ?? []).length
      let controlCount = 0
      for (let i = 0; i < t.length; i++) {
        const code = t.charCodeAt(i)
        if (
          (code >= 0 && code <= 8) ||
          (code >= 11 && code <= 31) ||
          code === 127
        )
          controlCount += 1
      }
      return alnumCount * 4 - replacementCount * 15 - controlCount * 10
    }

    const decodeTitle = (bytes: Uint8Array) => {
      const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
      const latin1Text = new TextDecoder('latin1', { fatal: false }).decode(
        bytes,
      )

      const utf8Title = extractTitle(utf8Text)
      const latin1Title = extractTitle(latin1Text)

      if (utf8Title && latin1Title) {
        return titleQualityScore(utf8Title) >= titleQualityScore(latin1Title)
          ? utf8Title
          : latin1Title
      }
      return utf8Title ?? latin1Title ?? null
    }

    const concatChunks = (chunks: Uint8Array[], total: number) => {
      const out = new Uint8Array(total)
      let offset = 0
      for (const chunk of chunks) {
        out.set(chunk, offset)
        offset += chunk.length
      }
      return out
    }

    try {
      const url = String(rawUrl ?? '').trim()
      if (!url) return { ok: false, status: 400, title: null }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 7000)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Sona/RadioMetadata',
          'Icy-MetaData': '1',
          Accept: '*/*',
        },
        redirect: 'follow',
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        clearTimeout(timeout)
        return { ok: false, status: response.status, title: null }
      }

      const metaIntRaw = response.headers.get('icy-metaint')
      const metaInt = Number.parseInt(metaIntRaw ?? '', 10)
      if (!Number.isFinite(metaInt) || metaInt <= 0) {
        clearTimeout(timeout)
        return { ok: true, status: response.status, title: null }
      }

      const reader = response.body.getReader()
      const maxMetadataBlocks = 10
      const maxBytes = Math.max(
        metaInt * maxMetadataBlocks + 64 * 1024,
        1024 * 1024,
      )

      let totalBytes = 0
      let blocksSeen = 0
      let mode: 'audio' | 'meta_length' | 'meta' = 'audio'
      let audioRemaining = metaInt
      let metadataRemaining = 0
      let metadataChunks: Uint8Array[] = []
      let metadataTotal = 0

      while (totalBytes < maxBytes && blocksSeen < maxMetadataBlocks) {
        const { done, value } = await reader.read()
        if (done || !value) break

        totalBytes += value.length
        let offset = 0

        while (offset < value.length) {
          if (mode === 'audio') {
            const consume = Math.min(audioRemaining, value.length - offset)
            offset += consume
            audioRemaining -= consume
            if (audioRemaining === 0) mode = 'meta_length'
            continue
          }

          if (mode === 'meta_length') {
            const lengthByte = value[offset] ?? 0
            offset += 1
            blocksSeen += 1
            metadataRemaining = lengthByte * 16

            if (metadataRemaining <= 0) {
              mode = 'audio'
              audioRemaining = metaInt
              continue
            }

            metadataChunks = []
            metadataTotal = 0
            mode = 'meta'
            continue
          }

          const consume = Math.min(metadataRemaining, value.length - offset)
          if (consume > 0) {
            const piece = value.slice(offset, offset + consume)
            metadataChunks.push(piece)
            metadataTotal += consume
            offset += consume
            metadataRemaining -= consume
          }

          if (metadataRemaining === 0) {
            const metadata = concatChunks(metadataChunks, metadataTotal)
            const title = decodeTitle(metadata)
            if (title?.trim()) {
              clearTimeout(timeout)
              reader.cancel().catch(() => undefined)
              return { ok: true, status: response.status, title: title.trim() }
            }

            mode = 'audio'
            audioRemaining = metaInt
          }
        }
      }

      clearTimeout(timeout)
      reader.cancel().catch(() => undefined)
      return { ok: true, status: response.status, title: null }
    } catch {
      return { ok: false, status: 0, title: null }
    }
  })

  ipcMain.on(IpcChannels.ToggleMaximize, (_, isMaximized: boolean) => {
    if (isMaximized) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.on(IpcChannels.ToggleMinimize, () => {
    window.minimize()
  })

  ipcMain.on(IpcChannels.CloseWindow, () => {
    window.close()
  })

  ipcMain.on(IpcChannels.ThemeChanged, (_, colors: OverlayColors) => {
    const { bgColor } = colors

    if (bgColor) {
      colorsState.set('bgColor', bgColor)
    }
    // Native titlebar overlay is disabled globally. Keep bg-color persistence only.
    return
  })

  ipcMain.on(IpcChannels.UpdateNativeTheme, (_, isDark: boolean) => {
    nativeTheme.themeSource = isDark ? 'dark' : 'light'
  })

  ipcMain.on(
    IpcChannels.UpdatePlayerState,
    (_, payload: PlayerStatePayload) => {
      playerState.setAll(payload)

      setTimeout(() => {
        setTaskbarButtons()
        updateTray()
      }, 150)
    },
  )

  ipcMain.on(IpcChannels.SetDiscordRpcActivity, (_, payload: RpcPayload) => {
    setDiscordRpcActivity(payload)
  })

  ipcMain.on(IpcChannels.ClearDiscordRpcActivity, () => {
    clearDiscordRpcActivity()
  })

  ipcMain.on(IpcChannels.SaveAppSettings, (_, payload: ISettingPayload) => {
    saveAppSettings(payload)
  })

  ipcMain.on(IpcChannels.SetMiniPlayerMode, (_, enabled: boolean) => {
    if (enabled) {
      isMiniPlayerMode = true
      if (restoreMouseEventsTimer) {
        clearTimeout(restoreMouseEventsTimer)
        restoreMouseEventsTimer = null
      }
      window.setIgnoreMouseEvents(false)
      miniPlayerPrevBounds = window.getBounds()
      miniPlayerPrevMaximized = window.isMaximized()
      miniPlayerPrevMinimizable = window.isMinimizable()
      miniPlayerPrevMaximizable = window.isMaximizable()
      miniPlayerPrevResizable = window.isResizable()
      miniPlayerPrevClosable = window.isClosable()
      miniPlayerPrevFullScreenable = window.isFullScreenable()

      const mainBounds = miniPlayerPrevMaximized
        ? window.getNormalBounds()
        : miniPlayerPrevBounds
      setStoredMainBounds(mainBounds)
      setStoredMainIsMaximized(miniPlayerPrevMaximized)

      if (window.isFullScreen()) {
        window.setFullScreen(false)
      }
      if (window.isMaximized()) {
        window.unmaximize()
      }

      window.setMinimumSize(miniWidth, miniHeight)
      window.setMinimizable(false)
      window.setMaximizable(false)
      window.setResizable(false)
      window.setClosable(false)
      window.setFullScreenable(false)
      const persistedMiniBounds = getStoredMiniBounds()
      const targetMiniBounds = persistedMiniBounds ?? miniPlayerLastBounds
      if (targetMiniBounds) {
        window.setBounds(
          {
            x: targetMiniBounds.x,
            y: targetMiniBounds.y,
            width: miniWidth,
            height: miniHeight,
          },
          true,
        )
      } else {
        window.setSize(miniWidth, miniHeight, true)
        window.center()
      }
      return
    }

    isMiniPlayerMode = false
    miniPlayerLastBounds = window.getBounds()
    setStoredMiniBounds(miniPlayerLastBounds)
    window.setAlwaysOnTop(false)
    window.setMinimumSize(mainMinWidth, defaultHeight)
    window.setMinimizable(miniPlayerPrevMinimizable)
    window.setMaximizable(miniPlayerPrevMaximizable)
    window.setResizable(miniPlayerPrevResizable)
    window.setClosable(miniPlayerPrevClosable)
    window.setFullScreenable(miniPlayerPrevFullScreenable)

    const persistedMainBounds = getStoredMainBounds()
    const persistedMainIsMaximized = getStoredMainIsMaximized()
    const shouldMaximize = miniPlayerPrevMaximized || persistedMainIsMaximized
    if (shouldMaximize) {
      window.maximize()
      return
    }

    if (miniPlayerPrevBounds.width > 0 && miniPlayerPrevBounds.height > 0) {
      window.setBounds(
        {
          ...miniPlayerPrevBounds,
          width: Math.max(miniPlayerPrevBounds.width, mainMinWidth),
        },
        true,
      )
    } else if (persistedMainBounds) {
      window.setBounds(
        {
          ...persistedMainBounds,
          width: Math.max(persistedMainBounds.width, mainMinWidth),
        },
        true,
      )
    } else {
      window.setSize(mainMinWidth, defaultHeight, true)
      window.center()
    }

    // Prevent click-through from the expand button into native title controls.
    window.setIgnoreMouseEvents(true)
    restoreMouseEventsTimer = setTimeout(() => {
      window.setIgnoreMouseEvents(false)
    }, 260)
  })

  ipcMain.on(IpcChannels.SetMiniPlayerPinned, (_, pinned: boolean) => {
    window.setAlwaysOnTop(pinned)
  })
}

