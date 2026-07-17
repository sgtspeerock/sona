import { EpisodeWithPodcast } from './responses/podcasts'
import { Radio } from './responses/radios'
import { ISong } from './responses/song'
import type { VisualizerPreset } from './visualizer'

export enum LoopState {
  Off = 0,
  All = 1,
  One = 2,
}

export interface ISongList {
  shuffledList: ISong[]
  currentList: ISong[]
  currentSongIndex: number
  currentSong: ISong
  originalList: ISong[]
  originalSongIndex: number
  radioList: Radio[]
  podcastList: EpisodeWithPodcast[]
  podcastListProgresses: number[]
}

export interface IPlayerState {
  isPlaying: boolean
  loopState: LoopState
  isShuffleActive: boolean
  isSongStarred: boolean
  volume: number
  currentDuration: number
  mediaType: 'song' | 'radio' | 'podcast'
  currentPlaybackRate: number
  audioPlayerRef: HTMLAudioElement | null
  mainDrawerState: boolean
  queueState: boolean
  lyricsState: boolean
  hasPrev: boolean
  hasNext: boolean
  isDaytimeMoodActive: boolean
  isDashboardEditing: boolean
}

export interface IPlayerProgress {
  progress: number
}

export interface IVolumeSettings {
  min: number
  max: number
  step: number
  wheelStep: number
}

export type ReplayGainType = 'track' | 'album'

interface IReplayGainData {
  enabled: boolean
  type: ReplayGainType
  preAmp: number
  error: boolean
  defaultGain: number
}

interface IReplayGainActions {
  setReplayGainEnabled: (value: boolean) => void
  setReplayGainType: (value: ReplayGainType) => void
  setReplayGainPreAmp: (value: number) => void
  setReplayGainError: (value: boolean) => void
  setReplayGainDefaultGain: (value: number) => void
}

interface IReplayGain {
  values: IReplayGainData
  actions: IReplayGainActions
}

interface ICrossfade {
  enabled: boolean
  setEnabled: (value: boolean) => void
  durationSeconds: number
  setDurationSeconds: (value: number) => void
}

interface IListeningMemory {
  enabled: boolean
  setEnabled: (value: boolean) => void
}

export type SessionMode = 'off' | 'focus' | 'night'

interface ISessionModeSettings {
  mode: SessionMode
  setMode: (value: SessionMode) => void
  focusGenres: string[]
  nightGenres: string[]
  setFocusGenres: (values: string[]) => void
  setNightGenres: (values: string[]) => void
  resetFocusGenres: () => void
  resetNightGenres: () => void
}

interface IFullscreen {
  autoFullscreenEnabled: boolean
  setAutoFullscreenEnabled: (value: boolean) => void
}

interface ILyrics {
  preferSyncedLyrics: boolean
  setPreferSyncedLyrics: (value: boolean) => void
}

interface IEqualizer {
  enabled: boolean
  setEnabled: (value: boolean) => void
  gains: number[]
  setGains: (value: number[]) => void
}

interface LrcLib {
  enabled: boolean
  setEnabled: (value: boolean) => void
  customUrlEnabled: boolean
  setCustomUrlEnabled: (value: boolean) => void
  customUrl: string
  setCustomUrl: (value: string) => void
}

export interface IPrivacySettings {
  lrclib: LrcLib
}

interface IBlurSettings {
  value: number
  settings: {
    min: number
    max: number
    step: number
  }
}

interface IBigPlayerSettings {
  useSongColor: boolean
  blur: IBlurSettings
}

interface IQueueSettings {
  useSongColor: boolean
}

export interface AlbumColorPalette {
  dominant: string
  vibrant: string
  muted: string
  accent: string
}

interface IColorsSettings {
  currentSongColor: string | null
  currentSongColorPalette: AlbumColorPalette | null
  currentSongColorIntensity: number
  bigPlayer: IBigPlayerSettings
  queue: IQueueSettings
}

interface IVisualizerSettings {
  preset: VisualizerPreset
  autoQualityEnabled: boolean
}

export interface IAISettings {
  enabled: boolean
  apiKey: string
  setEnabled: (value: boolean) => void
  setApiKey: (value: string) => void
}

export interface IDashboardLayoutSettings {
  row1: string[]
  row2: string[]
  row3: string[]
  columnsTop: number
  columnsMiddle: number
  columnsBottom: number
  setRow1: (layout: string[]) => void
  setRow2: (layout: string[]) => void
  setRow3: (layout: string[]) => void
  setColumnsTop: (cols: number) => void
  setColumnsMiddle: (cols: number) => void
  setColumnsBottom: (cols: number) => void
}

export interface IPlayerSettings {
  volume: IVolumeSettings
  fullscreen: IFullscreen
  lyrics: ILyrics
  equalizer: IEqualizer
  replayGain: IReplayGain
  crossfade: ICrossfade
  listeningMemory: IListeningMemory
  sessionMode: ISessionModeSettings
  privacy: IPrivacySettings
  colors: IColorsSettings
  visualizer: IVisualizerSettings
  ai: IAISettings
  dashboardLayout: IDashboardLayoutSettings
}

export interface IPlayerActions {
  playSong: (song: ISong) => void
  setSongList: (songlist: ISong[], index: number, shuffle?: boolean) => void
  playDaytimeMoodPlaylist: () => Promise<void>
  setIsDashboardEditing: (value: boolean) => void
  setCurrentSong: () => void
  checkIsSongStarred: () => void
  starSongInQueue: (id: string) => void
  starCurrentSong: () => Promise<void>
  setPlayingState: (status: boolean) => void
  togglePlayPause: () => void
  toggleLoop: () => void
  toggleShuffle: () => void
  checkActiveSong: (id: string) => boolean
  playNextSong: () => void
  advanceToNextSongWithoutReset: () => void
  playPrevSong: () => void
  hasNextSong: () => boolean
  hasPrevSong: () => boolean
  isPlayingOneSong: () => boolean
  clearPlayerState: () => void
  resetProgress: () => void
  setProgress: (progress: number) => void
  setVolume: (volume: number) => void
  handleVolumeWheel: (isScrollingDown: boolean) => void
  setCurrentDuration: (duration: number) => void
  setPlayRadio: (list: Radio[], index: number) => void
  setAudioPlayerRef: (ref: HTMLAudioElement) => void
  setNextOnQueue: (songlist: ISong[]) => void
  setLastOnQueue: (songlist: ISong[]) => void
  removeSongFromQueue: (id: string) => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  setMainDrawerState: (state: boolean) => void
  setActiveDrawerPanel: (panel: 'queue' | 'lyrics' | null) => void
  setQueueState: (state: boolean) => void
  toggleQueueAction: () => void
  setLyricsState: (state: boolean) => void
  toggleLyricsAction: () => void
  toggleQueueAndLyrics: () => void
  closeDrawer: () => void
  playFirstSongInQueue: () => void
  handleSongEnded: () => Promise<void>
  getCurrentProgress: () => number
  resetConfig: () => void
  setPlayPodcast: (
    list: EpisodeWithPodcast[],
    index: number,
    progress: number,
  ) => void
  setUpdatePodcastProgress: (value: number) => void
  getCurrentPodcastProgress: () => number
  setPlaybackRate: (value: number) => void
  setNextPodcast: (episode: EpisodeWithPodcast, progress: number) => void
  setLastPodcast: (episode: EpisodeWithPodcast, progress: number) => void
  updateQueueChecks: () => void
  setCurrentSongColor: (value: string | null) => void
  setCurrentSongColorPalette: (value: AlbumColorPalette | null) => void
  setCurrentSongIntensity: (value: number) => void
  setUseSongColorOnQueue: (value: boolean) => void
  setUseSongColorOnBigPlayer: (value: boolean) => void
  setBigPlayerBlurValue: (value: number) => void
  setVisualizerPreset: (value: VisualizerPreset) => void
  setVisualizerAutoQualityEnabled: (value: boolean) => void
  seedSonaDjTrack: (
    mode?: 'off' | 'adventure' | 'drift' | 'era',
  ) => Promise<void>
  setRuntimeSonaDjMode: (mode: 'off' | 'adventure' | 'drift' | 'era') => void
  startRuntimeShuffleAll: () => Promise<void>
  startSessionMode: (mode: SessionMode) => Promise<void>
}

export interface IPlayerContext {
  songlist: ISongList
  playerState: IPlayerState
  playerProgress: IPlayerProgress
  settings: IPlayerSettings
  actions: IPlayerActions
}
