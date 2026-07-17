import merge from 'lodash/merge'
import omit from 'lodash/omit'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'
import { pingServer } from '@/api/pingServer'
import { queryServerInfo } from '@/api/queryServerInfo'
import { AuthType, IAppContext, IServerConfig } from '@/types/serverConfig'
import type { SettingsPage } from '@/types/settings'
import { isDesktop } from '@/utils/desktop'
import { discordRpc } from '@/utils/discordRpc'
import { logger } from '@/utils/logger'
import {
  genEncodedPassword,
  genPassword,
  genPasswordToken,
  genUser,
  getAuthType,
  hasValidConfig,
} from '@/utils/salt'

const {
  SERVER_URL,
  HIDE_SERVER,
  HIDE_RADIOS_SECTION,
  SERVER_TYPE,
  IMAGE_CACHE_ENABLED,
} = window

export const useAppStore = createWithEqualityFn<IAppContext>()(
  subscribeWithSelector(
    persist(
      devtools(
        immer((set, get) => ({
          data: {
            isServerConfigured: hasValidConfig,
            osType: '',
            url: SERVER_URL ?? '',
            username: genUser(),
            password: genPassword(),
            authType: getAuthType(),
            protocolVersion: '1.16.0',
            serverType: SERVER_TYPE ?? 'subsonic',
            logoutDialogState: false,
            hideServer: HIDE_SERVER ?? false,
            lockUser: hasValidConfig,
            songCount: null,
          },
          accounts: {
            discord: {
              rpcEnabled: false,
              setRpcEnabled: (value) => {
                set((state) => {
                  state.accounts.discord.rpcEnabled = value
                })
              },
            },
          },
          integrations: {
            lidarr: {
              url: '',
              setUrl: (value) => {
                set((state) => {
                  state.integrations.lidarr.url = value
                })
              },
              apiKey: '',
              setApiKey: (value) => {
                set((state) => {
                  state.integrations.lidarr.apiKey = value
                })
              },
            },
            lastfm: {
              username: '',
              setUsername: (value) => {
                set((state) => {
                  state.integrations.lastfm.username = value
                })
              },
              apiKey: '',
              setApiKey: (value) => {
                set((state) => {
                  state.integrations.lastfm.apiKey = value
                })
              },
              showThisIsArtist: true,
              setShowThisIsArtist: (value) => {
                set((state) => {
                  state.integrations.lastfm.showThisIsArtist = value
                })
              },
            },
          },

          pages: {
            showInfoPanel: true,
            toggleShowInfoPanel: () => {
              const { showInfoPanel } = get().pages

              set((state) => {
                state.pages.showInfoPanel = !showInfoPanel
              })
            },
            hideRadiosSection: HIDE_RADIOS_SECTION ?? false,
            setHideRadiosSection: (value) => {
              set((state) => {
                state.pages.hideRadiosSection = value
              })
            },
            artistsPageViewType: 'table',
            setArtistsPageViewType: (type) => {
              set((state) => {
                state.pages.artistsPageViewType = type
              })
            },
            imagesCacheLayerEnabled: IMAGE_CACHE_ENABLED ?? true,
            setImagesCacheLayerEnabled: (value) => {
              set((state) => {
                state.pages.imagesCacheLayerEnabled = value
              })
            },
            autoPlaylistImport: false,
            setAutoPlaylistImport: (value) => {
              set((state) => {
                state.pages.autoPlaylistImport = value
              })
            },
            autoPlaylistImportExceptions: [],
            toggleAutoPlaylistImportException: (playlistId) => {
              set((state) => {
                const current = state.pages.autoPlaylistImportExceptions
                if (current.includes(playlistId)) {
                  state.pages.autoPlaylistImportExceptions = current.filter(
                    (id) => id !== playlistId,
                  )
                  return
                }
                state.pages.autoPlaylistImportExceptions = [
                  ...current,
                  playlistId,
                ]
              })
            },
            setAutoPlaylistImportExceptions: (exceptions) => {
              set((state) => {
                state.pages.autoPlaylistImportExceptions = exceptions
              })
            },
            listDensity: 'default',
            setListDensity: (value) => {
              set((state) => {
                state.pages.listDensity = value
              })
            },
            playlistOrder: [],
            setPlaylistOrder: (order) => {
              set((state) => {
                state.pages.playlistOrder = order
              })
            },
            hiddenGenres: [],
            setHiddenGenres: (genres) => {
              set((state) => {
                state.pages.hiddenGenres = [...new Set(genres)]
              })
            },
            toggleHiddenGenre: (genre) => {
              set((state) => {
                const key = genre.trim().toLowerCase()
                if (!key) return
                const current = state.pages.hiddenGenres
                if (current.includes(key)) {
                  state.pages.hiddenGenres = current.filter((g) => g !== key)
                  return
                }
                state.pages.hiddenGenres = [...current, key]
              })
            },
            genreAliases: {},
            setGenreAliases: (aliases) => {
              set((state) => {
                state.pages.genreAliases = aliases
              })
            },
            setGenreAlias: (source, target) => {
              set((state) => {
                const key = source.trim().toLowerCase()
                if (!key) return

                if (!target || key === target.trim().toLowerCase()) {
                  const next = { ...state.pages.genreAliases }
                  delete next[key]
                  state.pages.genreAliases = next
                  return
                }

                state.pages.genreAliases = {
                  ...state.pages.genreAliases,
                  [key]: target.trim().toLowerCase(),
                }
              })
            },
          },
          desktop: {
            data: {
              minimizeToTray: false,
              disableGpu: false,
            },
            actions: {
              setMinimizeToTray: (value) => {
                set((state) => {
                  state.desktop.data.minimizeToTray = value
                })
              },
              setDisableGpu: (value) => {
                set((state) => {
                  state.desktop.data.disableGpu = value
                })
              },
            },
          },
          command: {
            open: false,
            setOpen: (value) => {
              set((state) => {
                state.command.open = value
              })
            },
          },
          update: {
            openDialog: false,
            setOpenDialog: (value) => {
              set((state) => {
                state.update.openDialog = value
              })
            },
            remindOnNextBoot: false,
            setRemindOnNextBoot: (value) => {
              set((state) => {
                state.update.remindOnNextBoot = value
              })
            },
          },
          settings: {
            openDialog: false,
            setOpenDialog: (value) => {
              set((state) => {
                state.settings.openDialog = value
              })
            },
            currentPage: 'appearance' as SettingsPage,
            setCurrentPage: (page) => {
              set((state) => {
                state.settings.currentPage = page
              })
            },
          },
          actions: {
            setOsType: (value) => {
              set((state) => {
                state.data.osType = value
              })
            },
            setUrl: (value) => {
              set((state) => {
                state.data.url = value
              })
            },
            setUsername: (value) => {
              set((state) => {
                state.data.username = value
              })
            },
            setPassword: (value) => {
              set((state) => {
                state.data.password = value
              })
            },
            saveConfig: async ({ url, username, password }: IServerConfig) => {
              // try both token and password methods
              for (const authType of [AuthType.TOKEN, AuthType.PASSWORD]) {
                const token =
                  authType === AuthType.TOKEN
                    ? genPasswordToken(password)
                    : genEncodedPassword(password)

                const canConnect = await pingServer(
                  url,
                  username,
                  token,
                  authType,
                )

                const serverInfo = await queryServerInfo(url)

                if (canConnect) {
                  set((state) => {
                    state.data.url = url
                    state.data.username = username
                    state.data.password = token
                    state.data.authType = authType
                    state.data.protocolVersion = serverInfo.protocolVersion
                    state.data.serverType = serverInfo.serverType
                    state.data.isServerConfigured = true
                    state.data.extensionsSupported =
                      serverInfo.extensionsSupported
                  })
                  return true
                }
              }
              set((state) => {
                state.data.isServerConfigured = false
              })
              return false
            },
            removeConfig: () => {
              set((state) => {
                state.data.isServerConfigured = false
                state.data.osType = ''
                state.data.url = ''
                state.data.username = ''
                state.data.password = ''
                state.data.authType = AuthType.TOKEN
                state.data.protocolVersion = '1.16.0'
                state.data.serverType = 'subsonic'
                state.data.songCount = null
                state.data.extensionsSupported = {}
                state.pages.showInfoPanel = true
                state.pages.hideRadiosSection = HIDE_RADIOS_SECTION ?? false
                state.pages.artistsPageViewType = 'table'
                state.pages.imagesCacheLayerEnabled =
                  IMAGE_CACHE_ENABLED ?? true
                state.pages.listDensity = 'default'
                state.pages.hiddenGenres = []
                state.pages.genreAliases = {}
              })
            },
            setLogoutDialogState: (value) => {
              set((state) => {
                state.data.logoutDialogState = value
              })
            },
          },
        })),
        {
          name: 'app_store',
        },
      ),
      {
        name: 'app_store',
        version: 1,
        merge: (persistedState, currentState) => {
          try {
            const persisted = persistedState as Partial<IAppContext> | undefined

            let hideRadiosSection = false
            let enableImageCache = true

            if (persisted && persisted.pages) {
              hideRadiosSection = persisted.pages.hideRadiosSection ?? false
              enableImageCache = persisted.pages.imagesCacheLayerEnabled ?? true
            }
            if (HIDE_RADIOS_SECTION !== undefined) {
              hideRadiosSection = HIDE_RADIOS_SECTION
            }
            if (IMAGE_CACHE_ENABLED !== undefined) {
              enableImageCache = IMAGE_CACHE_ENABLED
            }

            if (hasValidConfig) {
              const newState = {
                data: {
                  isServerConfigured: true,
                  url: SERVER_URL as string,
                  username: genUser(),
                  password: genPassword(),
                  authType: getAuthType(),
                  hideServer: HIDE_SERVER ?? false,
                  serverType: SERVER_TYPE ?? 'subsonic',
                  lockUser: true,
                },
                pages: {
                  hideRadiosSection,
                  imagesCacheLayerEnabled: enableImageCache,
                },
              }

              if (persistedState) {
                return merge(currentState, persistedState, newState)
              }

              return merge(currentState, newState)
            }

            const withoutLockUser = {
              data: {
                lockUser: false,
              },
              pages: {
                hideRadiosSection,
                imagesCacheLayerEnabled: enableImageCache,
              },
            }

            if (persistedState) {
              return merge(currentState, persistedState, withoutLockUser)
            }

            return merge(currentState, withoutLockUser)
          } catch (error) {
            logger.error('[AppStore] [merge] - Unable to merge states', error)

            return currentState
          }
        },
        partialize: (state) => {
          const appStore = omit(
            state,
            'data.logoutDialogState',
            'data.hideServer',
            'command.open',
            'update',
            'settings',
          )

          return appStore
        },
      },
    ),
  ),
  shallow,
)

useAppStore.subscribe(
  (state) => state.accounts.discord.rpcEnabled,
  (currentState) => {
    if (currentState) {
      discordRpc.sendCurrentSong()
    } else {
      discordRpc.clear()
    }
  },
)

useAppStore.subscribe(
  (state) => state.desktop.data,
  (data) => {
    if (!isDesktop()) return

    window.api.saveAppSettings(data)
  },
  {
    equalityFn: shallow,
  },
)

export const useAppData = () => useAppStore((state) => state.data)
export const useAppAccounts = () => useAppStore((state) => state.accounts)
export const useAppIntegrations = () =>
  useAppStore((state) => state.integrations)
export const useAppPages = () => useAppStore((state) => state.pages)
export const useAppListDensity = () =>
  useAppStore((state) => ({
    listDensity: state.pages.listDensity,
    setListDensity: state.pages.setListDensity,
  }))
export const useAppDesktopData = () =>
  useAppStore((state) => state.desktop.data)
export const useAppDesktopActions = () =>
  useAppStore((state) => state.desktop.actions)
export const useAppActions = () => useAppStore((state) => state.actions)
export const useAppUpdate = () => useAppStore((state) => state.update)
export const useAppSettings = () => useAppStore((state) => state.settings)
export const useAppArtistsViewType = () =>
  useAppStore((state) => {
    const { artistsPageViewType, setArtistsPageViewType } = state.pages

    const isTableView = artistsPageViewType === 'table'
    const isGridView = artistsPageViewType === 'grid'

    return {
      artistsPageViewType,
      setArtistsPageViewType,
      isTableView,
      isGridView,
    }
  })
export const useAppImagesCacheLayer = () =>
  useAppStore((state) => ({
    imagesCacheLayerEnabled: state.pages.imagesCacheLayerEnabled,
    setImagesCacheLayerEnabled: state.pages.setImagesCacheLayerEnabled,
  }))

export const usePlaylistOrder = () =>
  useAppStore((state) => ({
    playlistOrder: state.pages.playlistOrder,
    setPlaylistOrder: state.pages.setPlaylistOrder,
  }))
