import type { SettingsPage } from '@/types/settings'

export enum AuthType {
  PASSWORD,
  TOKEN,
}

export interface IServerConfig {
  url: string
  username: string
  password: string
  protocolVersion?: string
  serverType?: string
  extensionsSupported?: Record<string, number[]>
}

export type PageViewType = 'grid' | 'table'
export type ListDensity = 'compact' | 'default' | 'cozy'

interface IAppPages {
  showInfoPanel: boolean
  toggleShowInfoPanel: () => void
  hideRadiosSection: boolean
  setHideRadiosSection: (value: boolean) => void
  artistsPageViewType: PageViewType
  setArtistsPageViewType: (type: PageViewType) => void
  imagesCacheLayerEnabled: boolean
  setImagesCacheLayerEnabled: (value: boolean) => void
  autoPlaylistImport: boolean
  setAutoPlaylistImport: (value: boolean) => void
  autoPlaylistImportExceptions: string[]
  toggleAutoPlaylistImportException: (playlistId: string) => void
  setAutoPlaylistImportExceptions: (exceptions: string[]) => void
  listDensity: ListDensity
  setListDensity: (value: ListDensity) => void
  playlistOrder: string[]
  setPlaylistOrder: (order: string[]) => void
  hiddenGenres: string[]
  setHiddenGenres: (genres: string[]) => void
  toggleHiddenGenre: (genre: string) => void
  genreAliases: Record<string, string>
  setGenreAliases: (aliases: Record<string, string>) => void
  setGenreAlias: (source: string, target: string | null) => void
}

export interface IAppData extends IServerConfig {
  authType: AuthType | null
  isServerConfigured: boolean
  osType: string
  logoutDialogState: boolean
  hideServer: boolean
  lockUser: boolean
  songCount: number | null
}

export interface IAppActions {
  setOsType: (value: string) => void
  setUrl: (value: string) => void
  setUsername: (value: string) => void
  setPassword: (value: string) => void
  saveConfig: (data: IServerConfig) => Promise<boolean>
  removeConfig: () => void
  setLogoutDialogState: (value: boolean) => void
}

export interface IAppCommand {
  open: boolean
  setOpen: (value: boolean) => void
}

export interface IAppUpdate {
  openDialog: boolean
  setOpenDialog: (value: boolean) => void
  remindOnNextBoot: boolean
  setRemindOnNextBoot: (value: boolean) => void
}

interface IAppSettings {
  openDialog: boolean
  setOpenDialog: (value: boolean) => void
  currentPage: SettingsPage
  setCurrentPage: (page: SettingsPage) => void
}

interface IAccounts {
  discord: {
    rpcEnabled: boolean
    setRpcEnabled: (value: boolean) => void
  }
}

interface IIntegrations {
  lidarr: {
    url: string
    setUrl: (value: string) => void
    apiKey: string
    setApiKey: (value: string) => void
  }
  lastfm: {
    username: string
    setUsername: (value: string) => void
    apiKey: string
    setApiKey: (value: string) => void
    showThisIsArtist: boolean
    setShowThisIsArtist: (value: boolean) => void
  }
}

// When changing the desktop data types
// You have to update the electron one.
// Located at -> electron > main > core > settings.ts
interface IDesktop {
  data: {
    minimizeToTray: boolean
    disableGpu: boolean
  }
  actions: {
    setMinimizeToTray: (value: boolean) => void
    setDisableGpu: (value: boolean) => void
  }
}

export interface IAppContext {
  data: IAppData
  accounts: IAccounts
  integrations: IIntegrations
  pages: IAppPages
  desktop: IDesktop
  command: IAppCommand
  actions: IAppActions
  update: IAppUpdate
  settings: IAppSettings
}
