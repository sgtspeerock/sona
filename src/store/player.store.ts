import { produce } from 'immer'
import clamp from 'lodash/clamp'
import merge from 'lodash/merge'
import omit from 'lodash/omit'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'
import { subsonic } from '@/service/subsonic'
import { IPlayerContext, ISongList, LoopState } from '@/types/playerContext'
import { ISong } from '@/types/responses/song'
import { areSongListsEqual } from '@/utils/compareSongLists'
import {
  getListeningMemoryEnabledPreference,
  setListeningMemoryEnabledPreference,
} from '@/utils/listening-memory'
import { addNextSongList, shuffleSongList } from '@/utils/songListFunctions'
import { idbStorage } from './idb'
import {
  createPlaybackEngine,
  PlaybackEngine,
  PlaybackEngineStoreApi,
} from './player/runtime/engine'
import { orchestrateSongEnded } from './player/runtime/playback-orchestrator'
import {
  DEFAULT_FOCUS_GENRES,
  DEFAULT_NIGHT_GENRES,
} from './player/session-mode-helpers'
import { registerPlayerStoreSideEffects } from './player/store-side-effects'
import { SonaDjMode } from './sona-dj.store'

export {
  DEFAULT_FOCUS_GENRES,
  DEFAULT_NIGHT_GENRES,
} from './player/session-mode-helpers'

const miniStores = {
  songlist: 'player_songlist',
  progress: 'player_progress',
}

const blurSettings = {
  min: 20,
  max: 100,
  step: 10,
}

const EQ_BAND_COUNT = 8
const EQ_MIN_GAIN = -12
const EQ_MAX_GAIN = 12
const DEFAULT_EQ_GAINS = Array.from({ length: EQ_BAND_COUNT }, () => 0)

function normalizeEqualizerGains(gains: unknown): number[] {
  if (!Array.isArray(gains)) return [...DEFAULT_EQ_GAINS]

  const normalized = gains
    .map((value) =>
      typeof value === 'number'
        ? clamp(Math.round(value), EQ_MIN_GAIN, EQ_MAX_GAIN)
        : 0,
    )
    .slice(0, EQ_BAND_COUNT)

  while (normalized.length < EQ_BAND_COUNT) {
    normalized.push(0)
  }

  return normalized
}

let playbackEngine: PlaybackEngine | null = null

function getPlaybackEngine() {
  if (!playbackEngine) {
    throw new Error('Playback engine is not initialized')
  }
  return playbackEngine
}
export const usePlayerStore = createWithEqualityFn<IPlayerContext>()(
  subscribeWithSelector(
    persist(
      devtools(
        immer((set, get) => ({
          songlist: {
            shuffledList: [],
            originalList: [],
            originalSongIndex: 0,
            currentSong: {} as ISong,
            currentList: [],
            currentSongIndex: 0,
            radioList: [],
            podcastList: [],
            podcastListProgresses: [],
          },
          playerState: {
            isPlaying: false,
            loopState: LoopState.Off,
            isShuffleActive: false,
            isSongStarred: false,
            volume: 100,
            currentDuration: 0,
            mediaType: 'song',
            audioPlayerRef: null,
            mainDrawerState: false,
            queueState: false,
            lyricsState: false,
            currentPlaybackRate: 1,
            hasPrev: false,
            hasNext: false,
          },
          playerProgress: {
            progress: 0,
          },
          settings: {
            privacy: {
              lrclib: {
                enabled: true,
                setEnabled(value) {
                  set((state) => {
                    state.settings.privacy.lrclib.enabled = value
                  })
                },
                customUrlEnabled: false,
                setCustomUrlEnabled(value) {
                  set((state) => {
                    state.settings.privacy.lrclib.customUrlEnabled = value
                  })
                },
                customUrl: 'https://lrclib.net',
                setCustomUrl(value) {
                  set((state) => {
                    state.settings.privacy.lrclib.customUrl = value
                  })
                },
              },
            },
            volume: {
              min: 0,
              max: 100,
              step: 1,
              wheelStep: 5,
            },
            fullscreen: {
              autoFullscreenEnabled: false,
              setAutoFullscreenEnabled: (value) => {
                set((state) => {
                  state.settings.fullscreen.autoFullscreenEnabled = value
                })
              },
            },
            lyrics: {
              preferSyncedLyrics: false,
              setPreferSyncedLyrics: (value) => {
                set((state) => {
                  state.settings.lyrics.preferSyncedLyrics = value
                })
              },
            },
            equalizer: {
              enabled: false,
              setEnabled: (value) => {
                set((state) => {
                  state.settings.equalizer.enabled = value
                })
              },
              gains: [...DEFAULT_EQ_GAINS],
              setGains: (value) => {
                set((state) => {
                  state.settings.equalizer.gains =
                    normalizeEqualizerGains(value)
                })
              },
            },
            replayGain: {
              values: {
                enabled: true,
                type: 'track',
                preAmp: 0,
                error: false,
                defaultGain: -6,
              },
              actions: {
                setReplayGainEnabled: (value) => {
                  set((state) => {
                    state.settings.replayGain.values.enabled = value
                  })
                },
                setReplayGainType: (value) => {
                  set((state) => {
                    state.settings.replayGain.values.type = value
                  })
                },
                setReplayGainPreAmp: (value) => {
                  set((state) => {
                    state.settings.replayGain.values.preAmp = value
                  })
                },
                setReplayGainError: (value) => {
                  set((state) => {
                    state.settings.replayGain.values.error = value
                  })
                },
                setReplayGainDefaultGain: (value) => {
                  set((state) => {
                    state.settings.replayGain.values.defaultGain = value
                  })
                },
              },
            },
            crossfade: {
              enabled: false,
              setEnabled: (value) => {
                set((state) => {
                  state.settings.crossfade.enabled = value
                })
              },
              durationSeconds: 3,
              setDurationSeconds: (value) => {
                set((state) => {
                  state.settings.crossfade.durationSeconds = clamp(
                    Math.round(value),
                    2,
                    8,
                  )
                })
              },
            },
            listeningMemory: {
              enabled: getListeningMemoryEnabledPreference(),
              setEnabled: (value) => {
                setListeningMemoryEnabledPreference(value)
                set((state) => {
                  state.settings.listeningMemory.enabled = value
                })
              },
            },
            sessionMode: {
              mode: 'off',
              setMode: (value) => {
                set((state) => {
                  state.settings.sessionMode.mode = value
                })
              },
              focusGenres: DEFAULT_FOCUS_GENRES,
              nightGenres: DEFAULT_NIGHT_GENRES,
              setFocusGenres: (values) => {
                set((state) => {
                  state.settings.sessionMode.focusGenres = values
                })
              },
              setNightGenres: (values) => {
                set((state) => {
                  state.settings.sessionMode.nightGenres = values
                })
              },
              resetFocusGenres: () => {
                set((state) => {
                  state.settings.sessionMode.focusGenres = DEFAULT_FOCUS_GENRES
                })
              },
              resetNightGenres: () => {
                set((state) => {
                  state.settings.sessionMode.nightGenres = DEFAULT_NIGHT_GENRES
                })
              },
            },
            colors: {
              currentSongColor: null,
              currentSongColorPalette: null,
              currentSongColorIntensity: 0.65,
              bigPlayer: {
                useSongColor: false,
                blur: {
                  value: 34,
                  settings: blurSettings,
                },
              },
              queue: {
                useSongColor: false,
              },
            },
            visualizer: {
              preset: 'frequency-circle',
              autoQualityEnabled: true,
            },
          },
          actions: {
            setSongList: (songlist, index, shuffle = false) => {
              const engine = getPlaybackEngine()
              engine.clearInjectedSongs()
              engine.setRuntimeShuffleEnabled(false)
              const { currentList, currentSongIndex } = get().songlist

              const listsAreEqual = areSongListsEqual(currentList, songlist)
              const songHasChanged = currentSongIndex !== index

              if (!listsAreEqual || (listsAreEqual && songHasChanged)) {
                get().actions.resetProgress()
              }

              if (listsAreEqual && songHasChanged && !shuffle) {
                set((state) => {
                  state.playerState.isPlaying = true
                  state.songlist.currentSongIndex = index
                })
                return
              }

              set((state) => {
                state.songlist.originalList = songlist
                state.songlist.originalSongIndex = index
                state.playerState.mediaType = 'song'
                state.songlist.radioList = []
                state.songlist.podcastList = []
              })

              if (shuffle) {
                const shuffledList = shuffleSongList(songlist, index, true)

                set((state) => {
                  state.songlist.shuffledList = shuffledList
                  state.songlist.currentList = shuffledList
                  state.songlist.currentSongIndex = 0
                  state.playerState.isShuffleActive = true
                  state.playerState.isPlaying = true
                })
              } else {
                set((state) => {
                  state.songlist.currentList = songlist
                  state.songlist.currentSongIndex = index
                  state.playerState.isShuffleActive = false
                  state.playerState.isPlaying = true
                })
              }
            },
            setCurrentSong: () => {
              const { currentList, currentSongIndex } = get().songlist

              if (currentList.length > 0) {
                set((state) => {
                  state.songlist.currentSong = currentList[currentSongIndex]
                })
              }
            },
            playSong: (song) => {
              const engine = getPlaybackEngine()
              engine.clearInjectedSongs()
              engine.setRuntimeShuffleEnabled(false)
              const { isPlaying } = get().playerState
              const songIsAlreadyPlaying = get().actions.checkActiveSong(
                song.id,
              )
              if (songIsAlreadyPlaying && !isPlaying) {
                set((state) => {
                  state.playerState.isPlaying = true
                })
              } else {
                get().actions.resetProgress()
                set((state) => {
                  state.playerState.mediaType = 'song'
                  state.songlist.currentList = [song]
                  state.songlist.currentSongIndex = 0
                  state.playerState.isShuffleActive = false
                  state.playerState.isPlaying = true
                  state.songlist.radioList = []
                  state.songlist.podcastList = []
                })
              }
            },
            setNextOnQueue: (list) => {
              const {
                currentList,
                currentSongIndex,
                currentSong,
                originalList,
              } = get().songlist

              const currentListIds = new Set(currentList.map((song) => song.id))
              const uniqueList = list.filter(
                (song) => !currentListIds.has(song.id),
              )

              const newCurrentList = addNextSongList(
                currentSongIndex,
                currentList,
                uniqueList,
              )

              const indexOnOriginalList = originalList.findIndex(
                (song) => song.id === currentSong.id,
              )
              const newOriginalList = addNextSongList(
                indexOnOriginalList,
                originalList,
                uniqueList,
              )

              set((state) => {
                state.songlist.currentList = newCurrentList
                state.songlist.originalList = newOriginalList
              })

              const { isPlaying } = get().playerState

              if (!isPlaying) {
                get().actions.setPlayingState(true)
              }
            },
            seedSonaDjTrack: async (mode) => {
              await getPlaybackEngine().seedSonaDjTrack(mode as SonaDjMode)
            },
            startRuntimeShuffleAll: async () => {
              const initialList =
                await getPlaybackEngine().startRuntimeShuffleAll()
              if (initialList.length === 0) return

              get().actions.resetProgress()
              set((state) => {
                state.playerState.mediaType = 'song'
                state.songlist.currentList = initialList
                state.songlist.originalList = initialList
                state.songlist.currentSongIndex = 0
                state.playerState.isShuffleActive = false
                state.playerState.isPlaying = true
                state.songlist.radioList = []
                state.songlist.podcastList = []
              })
            },
            startSessionMode: async (mode) => {
              set((state) => {
                state.settings.sessionMode.mode = mode
              })

              const engine = getPlaybackEngine()
              engine.setRuntimeMode(SonaDjMode.Off)
              engine.setRuntimeShuffleEnabled(false)

              if (mode === 'off') return

              await get().actions.startRuntimeShuffleAll()
            },
            setLastOnQueue: (list) => {
              const { currentList, originalList } = get().songlist

              const currentListIds = new Set(currentList.map((song) => song.id))
              const uniqueList = list.filter(
                (song) => !currentListIds.has(song.id),
              )

              const newCurrentList = [...currentList, ...uniqueList]
              const newOriginalList = [...originalList, ...uniqueList]

              set((state) => {
                state.songlist.currentList = newCurrentList
                state.songlist.originalList = newOriginalList
              })

              const { isPlaying } = get().playerState

              if (!isPlaying) {
                get().actions.setPlayingState(true)
              }
            },
            setPlayRadio: (list, index) => {
              const { mediaType } = get().playerState
              const { radioList, currentSongIndex } = get().songlist

              if (
                mediaType === 'radio' &&
                radioList.length > 0 &&
                list[index].id === radioList[currentSongIndex].id
              ) {
                set((state) => {
                  state.playerState.isPlaying = true
                })
                return
              }

              get().actions.clearPlayerState()
              set((state) => {
                state.playerState.mediaType = 'radio'
                state.songlist.radioList = list
                state.songlist.currentSongIndex = index
                state.playerState.isPlaying = true
              })
            },
            setPlayPodcast: (list, index, progress) => {
              const { mediaType } = get().playerState
              const { podcastList, currentSongIndex } = get().songlist

              if (
                mediaType === 'podcast' &&
                podcastList.length > 0 &&
                list[index].id === podcastList[currentSongIndex].id
              ) {
                set((state) => {
                  state.playerState.isPlaying = true
                })
                return
              }

              get().actions.clearPlayerState()
              set((state) => {
                state.playerState.mediaType = 'podcast'
                state.songlist.podcastList = list
                state.songlist.currentSongIndex = index
                state.playerState.isPlaying = true
                state.songlist.podcastListProgresses[index] = progress
              })
            },
            setUpdatePodcastProgress: (progress) => {
              const { mediaType } = get().playerState
              if (mediaType !== 'podcast') return

              const { currentSongIndex } = get().songlist

              set((state) => {
                state.songlist.podcastListProgresses[currentSongIndex] =
                  progress
              })
            },
            getCurrentPodcastProgress: () => {
              const { mediaType } = get().playerState
              if (mediaType !== 'podcast') return 0

              const { podcastListProgresses, currentSongIndex } = get().songlist

              return podcastListProgresses[currentSongIndex] ?? 0
            },
            setNextPodcast: (episode, progress) => {
              const { podcastList, currentSongIndex } = get().songlist

              const currentListIds = new Set(
                podcastList.map((episode) => episode.id),
              )
              if (currentListIds.has(episode.id)) {
                return
              }

              const newPodcastList = addNextSongList(
                currentSongIndex,
                podcastList,
                [episode],
              )

              const nextIndex = currentSongIndex + 1

              set((state) => {
                state.songlist.podcastList = newPodcastList
                state.playerState.mediaType = 'podcast'
                state.songlist.podcastListProgresses[nextIndex] = progress
              })

              const { isPlaying } = get().playerState

              if (!isPlaying) {
                get().actions.setPlayingState(true)
              }
            },
            setLastPodcast: (episode, progress) => {
              const { podcastList } = get().songlist

              const currentListIds = new Set(
                podcastList.map((episode) => episode.id),
              )
              if (currentListIds.has(episode.id)) {
                return
              }

              const newPodcastList = [...podcastList, episode]

              const lastIndex = newPodcastList.length - 1

              set((state) => {
                state.songlist.podcastList = newPodcastList
                state.playerState.mediaType = 'podcast'
                state.songlist.podcastListProgresses[lastIndex] = progress
              })

              const { isPlaying } = get().playerState

              if (!isPlaying) {
                get().actions.setPlayingState(true)
              }
            },
            setPlayingState: (status) => {
              set((state) => {
                state.playerState.isPlaying = status
              })
            },
            togglePlayPause: () => {
              set((state) => {
                state.playerState.isPlaying = !state.playerState.isPlaying
              })
            },
            toggleLoop: () => {
              const { loopState } = get().playerState

              // Cycles to the next state
              const newState =
                (loopState + 1) % (Object.keys(LoopState).length / 2)

              set((state) => {
                state.playerState.loopState = newState
              })
            },
            toggleShuffle: () => {
              const { isShuffleActive } = get().playerState
              const { currentList } = get().songlist

              const listLength = currentList.length
              const isPlayingOneOrLess = listLength <= 1

              if (isPlayingOneOrLess) return

              if (isShuffleActive) {
                const currentSongId = get().songlist.currentSong.id
                const index = get().songlist.originalList.findIndex(
                  (song) => song.id === currentSongId,
                )

                set((state) => {
                  state.songlist.currentList = state.songlist.originalList
                  state.songlist.currentSongIndex = index
                  state.playerState.isShuffleActive = false
                })
              } else {
                const { currentList, currentSongIndex } = get().songlist
                const playedSegment = currentList.slice(0, currentSongIndex + 1)
                const upcomingSegment = shuffleSongList(
                  currentList.slice(currentSongIndex + 1),
                  0,
                  true,
                )
                const shuffledList = [...playedSegment, ...upcomingSegment]

                set((state) => {
                  state.songlist.shuffledList = shuffledList
                  state.songlist.currentList = shuffledList
                  state.songlist.currentSongIndex = currentSongIndex
                  state.playerState.isShuffleActive = true
                })
              }
            },
            playNextSong: () => {
              const { loopState } = get().playerState
              const { hasNextSong, resetProgress, playFirstSongInQueue } =
                get().actions

              if (hasNextSong()) {
                resetProgress()
                set((state) => {
                  state.songlist.currentSongIndex += 1
                  state.playerState.isPlaying = true
                  const nextIdx = state.songlist.currentSongIndex
                  state.playerState.hasNext =
                    nextIdx + 1 < state.songlist.currentList.length
                  state.playerState.hasPrev = nextIdx > 0
                })
              } else if (loopState === LoopState.All) {
                resetProgress()
                playFirstSongInQueue()
                set((state) => {
                  state.playerState.isPlaying = true
                  state.playerState.hasNext =
                    state.songlist.currentList.length > 1
                  state.playerState.hasPrev = false
                })
              }
            },
            advanceToNextSongWithoutReset: () => {
              const { loopState } = get().playerState
              const { hasNextSong, playFirstSongInQueue } = get().actions

              if (hasNextSong()) {
                set((state) => {
                  state.songlist.currentSongIndex += 1
                  state.playerState.isPlaying = true
                  const nextIdx = state.songlist.currentSongIndex
                  state.playerState.hasNext =
                    nextIdx + 1 < state.songlist.currentList.length
                  state.playerState.hasPrev = nextIdx > 0
                })
              } else if (loopState === LoopState.All) {
                playFirstSongInQueue()
                set((state) => {
                  state.playerState.isPlaying = true
                  state.playerState.hasNext =
                    state.songlist.currentList.length > 1
                  state.playerState.hasPrev = false
                })
              }
            },
            playPrevSong: () => {
              if (get().actions.hasPrevSong()) {
                get().actions.resetProgress()
                set((state) => {
                  state.songlist.currentSongIndex -= 1
                  state.playerState.isPlaying = true
                  const prevIdx = state.songlist.currentSongIndex
                  state.playerState.hasNext =
                    prevIdx + 1 < state.songlist.currentList.length
                  state.playerState.hasPrev = prevIdx > 0
                })
              }
            },
            clearPlayerState: () => {
              const engine = getPlaybackEngine()
              engine.clearInjectedSongs()
              engine.setRuntimeShuffleEnabled(false)
              set((state) => {
                state.songlist.originalList = []
                state.songlist.shuffledList = []
                state.songlist.currentList = []
                state.songlist.currentSong = {} as ISong
                state.songlist.radioList = []
                state.songlist.podcastList = []
                state.songlist.podcastListProgresses = []
                state.songlist.originalSongIndex = 0
                state.songlist.currentSongIndex = 0
                state.playerState.mediaType = 'song'
                state.playerState.isPlaying = false
                state.playerState.loopState = LoopState.Off
                state.playerState.isShuffleActive = false
                state.playerState.mainDrawerState = false
                state.playerState.queueState = false
                state.playerState.lyricsState = false
                state.playerState.currentDuration = 0
                state.playerState.audioPlayerRef = null
                state.settings.colors.currentSongColor = null
                state.settings.colors.currentSongColorPalette = null
              })
            },
            resetProgress: () => {
              set((state) => {
                state.playerProgress.progress = 0
              })
            },
            setProgress: (progress) => {
              if (get().playerProgress.progress === progress) return
              set((state) => {
                state.playerProgress.progress = progress
              })
            },
            setVolume: (volume) => {
              set((state) => {
                state.playerState.volume = volume
              })
            },
            handleVolumeWheel: (isScrollingDown) => {
              const { min, max, wheelStep } = get().settings.volume
              const { volume } = get().playerState

              if (isScrollingDown && volume === min) return
              if (!isScrollingDown && volume === max) return

              const volumeAdjustment = isScrollingDown ? -wheelStep : wheelStep
              const adjustedVolume = volume + volumeAdjustment
              const finalVolume = clamp(adjustedVolume, min, max)

              set((state) => {
                state.playerState.volume = finalVolume
              })
            },
            setCurrentDuration: (duration) => {
              set((state) => {
                state.playerState.currentDuration = duration
              })
            },
            hasNextSong: () => {
              const { mediaType } = get().playerState
              const { currentList, currentSongIndex, radioList, podcastList } =
                get().songlist

              const nextIndex = currentSongIndex + 1

              if (mediaType === 'song') {
                return nextIndex < currentList.length
              }
              if (mediaType === 'radio') {
                return nextIndex < radioList.length
              }
              if (mediaType === 'podcast') {
                return nextIndex < podcastList.length
              }

              return false
            },
            hasPrevSong: () => {
              const { currentSongIndex } = get().songlist
              return currentSongIndex > 0
            },
            isPlayingOneSong: () => {
              const { currentList } = get().songlist
              return currentList.length === 1
            },
            checkActiveSong: (id: string) => {
              const currentSong = get().songlist.currentSong
              if (currentSong) {
                return id === currentSong.id
              } else {
                return false
              }
            },
            checkIsSongStarred: () => {
              const { currentList, currentSongIndex } = get().songlist
              const { mediaType } = get().playerState
              const song = currentList[currentSongIndex]

              if (mediaType === 'song' && song) {
                const isStarred = typeof song.starred === 'string'

                set((state) => {
                  state.playerState.isSongStarred = isStarred
                })
              } else {
                set((state) => {
                  state.playerState.isSongStarred = false
                })
              }
            },
            starSongInQueue: (id) => {
              const { currentList } = get().songlist
              const { mediaType } = get().playerState

              if (currentList.length === 0 && mediaType !== 'song') return

              const songIndex = currentList.findIndex((song) => song.id === id)
              if (songIndex === -1) return

              const songList = [...currentList]
              const isSongStarred =
                typeof songList[songIndex].starred === 'string'

              songList[songIndex] = {
                ...songList[songIndex],
                starred: isSongStarred ? undefined : new Date().toISOString(),
              }

              set((state) => {
                state.songlist.currentList = songList
              })
            },
            starCurrentSong: async () => {
              const { currentList, currentSongIndex } = get().songlist
              const { mediaType } = get().playerState

              if (currentList.length === 0 && mediaType !== 'song') return

              const { id, starred } = get().songlist.currentSong
              const isSongStarred = typeof starred === 'string'
              await subsonic.star.handleStarItem({
                id,
                starred: isSongStarred,
              })

              const songList = [...currentList]
              songList[currentSongIndex] = {
                ...songList[currentSongIndex],
                starred: isSongStarred ? undefined : new Date().toISOString(),
              }

              set((state) => {
                state.songlist.currentList = songList
              })
            },
            setPlaybackRate: (value) => {
              set((state) => {
                state.playerState.currentPlaybackRate = value
              })
            },
            setAudioPlayerRef: (audioPlayer) => {
              set(
                produce((state: IPlayerContext) => {
                  state.playerState.audioPlayerRef = audioPlayer
                }),
              )
            },
            removeSongFromQueue: (id) => {
              const {
                currentList,
                originalList,
                shuffledList,
                currentSongIndex,
                originalSongIndex,
              } = get().songlist

              // Get the removed song index to adjust the current one.
              const removedSongIndex = currentList.findIndex(
                (song) => song.id === id,
              )
              const newCurrentList = currentList.filter(
                (song) => song.id !== id,
              )

              // Clear player state if list is empty
              if (newCurrentList.length === 0) {
                get().actions.clearPlayerState()
                return
              }

              // In case of removing current song, resets the progress
              if (removedSongIndex === currentSongIndex) {
                get().actions.resetProgress()
              }

              const newOriginalList = originalList.filter(
                (song) => song.id !== id,
              )
              const newShuffledList = shuffledList.filter(
                (song) => song.id !== id,
              )

              // Update index to fit new current list
              const updatedCurrentIndex = Math.min(
                currentSongIndex -
                  (removedSongIndex < currentSongIndex ? 1 : 0),
                newCurrentList.length - 1,
              )

              // Update original index
              const removedOriginalIndex = originalList.findIndex(
                (song) => song.id === id,
              )
              const updatedOriginalIndex = Math.min(
                originalSongIndex -
                  (removedOriginalIndex < originalSongIndex ? 1 : 0),
                newOriginalList.length - 1,
              )

              set((state) => {
                state.songlist.currentList = newCurrentList
                state.songlist.originalList = newOriginalList
                state.songlist.shuffledList = newShuffledList
                state.songlist.currentSongIndex = updatedCurrentIndex
                state.songlist.originalSongIndex = updatedOriginalIndex
              })
            },
            reorderQueue: (fromIndex, toIndex) => {
              const { currentList, currentSongIndex } = get().songlist

              const newList = [...currentList]
              const [moved] = newList.splice(fromIndex, 1)
              newList.splice(toIndex, 0, moved)

              // Adjust currentSongIndex so the playing song stays correct
              let newSongIndex = currentSongIndex
              if (fromIndex === currentSongIndex) {
                newSongIndex = toIndex
              } else if (
                fromIndex < currentSongIndex &&
                toIndex >= currentSongIndex
              ) {
                newSongIndex = currentSongIndex - 1
              } else if (
                fromIndex > currentSongIndex &&
                toIndex <= currentSongIndex
              ) {
                newSongIndex = currentSongIndex + 1
              }

              set((state) => {
                state.songlist.currentList = newList
                state.songlist.currentSongIndex = newSongIndex
              })
            },
            setMainDrawerState: (status) => {
              set((state) => {
                state.playerState.mainDrawerState = status
              })
            },
            setActiveDrawerPanel: (panel) => {
              set((state) => {
                state.playerState.mainDrawerState = panel !== null
                state.playerState.queueState = panel === 'queue'
                state.playerState.lyricsState = panel === 'lyrics'
              })
            },
            setQueueState: (status) => {
              const { setActiveDrawerPanel } = get().actions
              if (status) {
                setActiveDrawerPanel('queue')
                return
              }

              set((state) => {
                state.playerState.queueState = status
                if (!state.playerState.lyricsState) {
                  state.playerState.mainDrawerState = false
                }
              })
            },
            toggleQueueAction: () => {
              const { queueState } = get().playerState
              const { setActiveDrawerPanel } = get().actions
              setActiveDrawerPanel(queueState ? null : 'queue')
            },
            setLyricsState: (status) => {
              const { setActiveDrawerPanel } = get().actions
              if (status) {
                setActiveDrawerPanel('lyrics')
                return
              }

              set((state) => {
                state.playerState.lyricsState = status
                if (!state.playerState.queueState) {
                  state.playerState.mainDrawerState = false
                }
              })
            },
            toggleLyricsAction: () => {
              const { lyricsState } = get().playerState
              const { setActiveDrawerPanel } = get().actions
              setActiveDrawerPanel(lyricsState ? null : 'lyrics')
            },
            toggleQueueAndLyrics: () => {
              const { queueState, lyricsState } = get().playerState
              const { setActiveDrawerPanel } = get().actions
              if (queueState) {
                setActiveDrawerPanel('lyrics')
                return
              }
              if (lyricsState) {
                setActiveDrawerPanel('queue')
                return
              }
              setActiveDrawerPanel('queue')
            },
            closeDrawer: () => {
              get().actions.setActiveDrawerPanel(null)
            },
            playFirstSongInQueue: () => {
              set((state) => {
                state.songlist.currentSongIndex = 0
              })
            },
            handleSongEnded: async () => {
              const { loopState } = get().playerState
              const engine = getPlaybackEngine()

              await orchestrateSongEnded(
                loopState,
                {
                  hasNextSong: get().actions.hasNextSong,
                  playNextSong: get().actions.playNextSong,
                  setPlayingState: get().actions.setPlayingState,
                  clearPlayerState: get().actions.clearPlayerState,
                  resetProgress: get().actions.resetProgress,
                  restartCurrentTrack: () => {
                    const audio = get().playerState.audioPlayerRef
                    if (audio) {
                      audio.currentTime = 0
                      audio.volume = getVolume() / 100
                      audio.play().catch(() => undefined)
                    }
                  },
                },
                {
                  ensureSonaDjNextTrack: engine.ensureSonaDjNextTrack,
                  ensureRuntimeShuffleNextTrack:
                    engine.ensureRuntimeShuffleNextTrack,
                  getRuntimeMode: engine.getRuntimeMode,
                  getRuntimeShuffleEnabled: engine.getRuntimeShuffleEnabled,
                },
              )
            },
            getCurrentProgress: () => {
              return get().playerProgress.progress
            },
            updateQueueChecks: () => {
              const { hasPrevSong, hasNextSong } = get().actions

              set((state) => {
                state.playerState.hasPrev = hasPrevSong()
                state.playerState.hasNext = hasNextSong()
              })
            },
            resetConfig: () => {
              set((state) => {
                state.settings.colors.queue.useSongColor = false
                state.settings.colors.bigPlayer.useSongColor = false
                state.settings.colors.bigPlayer.blur.value = 34
                state.settings.colors.bigPlayer.blur.settings = blurSettings
                state.settings.colors.currentSongColorIntensity = 0.65
                state.settings.fullscreen.autoFullscreenEnabled = false
                state.settings.lyrics.preferSyncedLyrics = false
                state.settings.replayGain.values = {
                  enabled: true,
                  type: 'track',
                  preAmp: 0,
                  error: false,
                  defaultGain: -6,
                }
                state.settings.equalizer.enabled = false
                state.settings.equalizer.gains = [...DEFAULT_EQ_GAINS]
                state.settings.listeningMemory.enabled = true
                state.settings.crossfade.enabled = false
                state.settings.crossfade.durationSeconds = 3
                state.settings.visualizer.preset = 'frequency-circle'
                state.settings.visualizer.autoQualityEnabled = true
                state.settings.sessionMode.mode = 'off'
                state.settings.sessionMode.focusGenres = DEFAULT_FOCUS_GENRES
                state.settings.sessionMode.nightGenres = DEFAULT_NIGHT_GENRES
              })
              setListeningMemoryEnabledPreference(true)
            },
            setCurrentSongColor: (value) => {
              set((state) => {
                state.settings.colors.currentSongColor = value
              })
            },
            setCurrentSongColorPalette: (value) => {
              set((state) => {
                state.settings.colors.currentSongColorPalette = value
              })
            },
            setCurrentSongIntensity: (value) => {
              set((state) => {
                state.settings.colors.currentSongColorIntensity = value
              })
            },
            setUseSongColorOnQueue: (value) => {
              set((state) => {
                state.settings.colors.queue.useSongColor = value
              })
            },
            setUseSongColorOnBigPlayer: (value) => {
              set((state) => {
                state.settings.colors.bigPlayer.useSongColor = value
              })
            },
            setBigPlayerBlurValue: (value) => {
              set((state) => {
                state.settings.colors.bigPlayer.blur.value = value
              })
            },
            setVisualizerPreset: (value) => {
              set((state) => {
                state.settings.visualizer.preset = value
              })
            },
            setVisualizerAutoQualityEnabled: (value) => {
              set((state) => {
                state.settings.visualizer.autoQualityEnabled = value
              })
            },
            setRuntimeSonaDjMode: (mode) => {
              getPlaybackEngine().setRuntimeMode(mode as SonaDjMode)
            },
          },
        })),
        { name: 'player_store' },
      ),
      {
        name: 'player_store',
        version: 1,
        merge: (persistedState, currentState) => {
          const merged = merge(currentState, persistedState)

          // Session Mode should always boot in normal mode.
          if (merged && typeof merged === 'object' && 'settings' in merged) {
            const settings = (merged as IPlayerContext).settings
            if (settings?.crossfade) {
              if (
                typeof settings.crossfade.durationSeconds !== 'number' ||
                Number.isNaN(settings.crossfade.durationSeconds)
              ) {
                settings.crossfade.durationSeconds = 3
              }
              settings.crossfade.durationSeconds = clamp(
                Math.round(settings.crossfade.durationSeconds),
                2,
                8,
              )
            }
            if (settings?.equalizer) {
              settings.equalizer.enabled = Boolean(settings.equalizer.enabled)
              settings.equalizer.gains = normalizeEqualizerGains(
                settings.equalizer.gains,
              )
            }
            if (settings?.replayGain?.values) {
              if (
                settings.replayGain.values.type !== 'track' &&
                settings.replayGain.values.type !== 'album'
              ) {
                settings.replayGain.values.type = 'track'
              }
            }
            if (settings?.sessionMode) {
              settings.sessionMode.mode = 'off'
              if (
                !Array.isArray(settings.sessionMode.focusGenres) ||
                settings.sessionMode.focusGenres.length === 0
              ) {
                settings.sessionMode.focusGenres = [...DEFAULT_FOCUS_GENRES]
              }
              if (
                !Array.isArray(settings.sessionMode.nightGenres) ||
                settings.sessionMode.nightGenres.length === 0
              ) {
                settings.sessionMode.nightGenres = [...DEFAULT_NIGHT_GENRES]
              }
            }
            if (settings && !settings.visualizer) {
              settings.visualizer = {
                preset: 'frequency-circle',
                autoQualityEnabled: true,
              }
            }
          }

          return merged
        },
        partialize: (state) => {
          const appStore = omit(state, [
            'songlist',
            'playerProgress',
            'actions',
            'playerState.isPlaying',
            'playerState.audioPlayerRef',
            'playerState.mainDrawerState',
            'playerState.queueState',
            'playerState.lyricsState',
            'state.settings.colors.bigPlayer.blur.settings',
          ])

          return appStore
        },
      },
    ),
  ),
  shallow,
)

playbackEngine = createPlaybackEngine({
  getState: usePlayerStore.getState,
  setState: usePlayerStore.setState as PlaybackEngineStoreApi['setState'],
})

// Restore songlist from IDB after store initializes (merge() is synchronous
// and cannot await the IDB read; we apply it here once the value resolves).
idbStorage.getItem<ISongList>(miniStores.songlist, (value) => {
  if (!value) return
  usePlayerStore.setState((state) => ({ ...state, songlist: value }))
})
idbStorage.getItem<number>(miniStores.progress, (value) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return
  usePlayerStore.setState((state) => ({
    ...state,
    playerProgress: { progress: Math.floor(value) },
  }))
})

usePlayerStore.subscribe(
  (state) => [state.songlist],
  ([songlist]) => {
    idbStorage.setItem(miniStores.songlist, songlist)
  },
  {
    equalityFn: shallow,
  },
)
usePlayerStore.subscribe(
  (state) => state.playerProgress.progress,
  (progress) => {
    idbStorage.setItem(miniStores.progress, Math.max(0, Math.floor(progress)))
  },
)

usePlayerStore.subscribe(
  (state) => [state.songlist.currentList, state.songlist.currentSongIndex],
  () => {
    const playerStore = usePlayerStore.getState()
    const { mediaType } = playerStore.playerState
    if (mediaType === 'radio' || mediaType === 'podcast') return

    playerStore.actions.checkIsSongStarred()
    playerStore.actions.setCurrentSong()

    const { currentList } = playerStore.songlist
    const { progress } = playerStore.playerProgress

    if (currentList.length === 0 && progress > 0) {
      playerStore.actions.resetProgress()
    }
  },
  {
    equalityFn: shallow,
  },
)

registerPlayerStoreSideEffects({
  store: usePlayerStore,
  ensureSonaDjNextTrack: () => getPlaybackEngine().ensureSonaDjNextTrack(),
  ensureRuntimeShuffleNextTrack: () =>
    getPlaybackEngine().ensureRuntimeShuffleNextTrack(),
})

export const usePlayerActions = () => usePlayerStore((state) => state.actions)

export const usePlayerSonglist = () =>
  usePlayerStore((state) => {
    const {
      currentList,
      currentSong,
      currentSongIndex,
      podcastList,
      radioList,
    } = state.songlist

    return {
      currentList,
      currentSong,
      currentSongIndex,
      podcastList,
      radioList,
    }
  })

export const usePlayerCurrentSong = () =>
  usePlayerStore((state) => state.songlist.currentSong)

export const usePlayerCurrentSongId = () =>
  usePlayerStore((state) => state.songlist.currentSong?.id)

export const usePlayerCurrentSongIndex = () =>
  usePlayerStore((state) => state.songlist.currentSongIndex)

export const usePlayerProgress = () =>
  usePlayerStore((state) => state.playerProgress.progress)

export const usePlayerVolume = () => ({
  volume: usePlayerStore((state) => state.playerState.volume),
  setVolume: usePlayerStore((state) => state.actions.setVolume),
  handleVolumeWheel: usePlayerStore((state) => state.actions.handleVolumeWheel),
})

export const useVolumeSettings = () =>
  usePlayerStore((state) => state.settings.volume)

export const useReplayGainState = () => {
  const { enabled, type, preAmp, error, defaultGain } = usePlayerStore(
    (state) => state.settings.replayGain.values,
  )

  return {
    replayGainEnabled: enabled,
    replayGainType: type,
    replayGainPreAmp: preAmp,
    replayGainError: error,
    replayGainDefaultGain: defaultGain,
  }
}

export const useReplayGainActions = () =>
  usePlayerStore((state) => state.settings.replayGain.actions)

export const useCrossfadeSettings = () =>
  usePlayerStore((state) => state.settings.crossfade)

export const useListeningMemorySettings = () =>
  usePlayerStore((state) => state.settings.listeningMemory)

export const useSessionModeSettings = () =>
  usePlayerStore((state) => state.settings.sessionMode)

export const useFullscreenPlayerSettings = () =>
  usePlayerStore((state) => state.settings.fullscreen)

export const useLrcLibSettings = () =>
  usePlayerStore((state) => state.settings.privacy.lrclib)

export const useLyricsSettings = () =>
  usePlayerStore((state) => state.settings.lyrics)

export const useEqualizerSettings = () =>
  usePlayerStore((state) => state.settings.equalizer)

export const usePlayerSettings = () => usePlayerStore((state) => state.settings)

export const usePlayerMediaType = () => {
  const mediaType = usePlayerStore((state) => state.playerState.mediaType)
  const isSong = mediaType === 'song'
  const isRadio = mediaType === 'radio'
  const isPodcast = mediaType === 'podcast'

  return {
    isSong,
    isRadio,
    isPodcast,
  }
}

export const usePlayerIsPlaying = () =>
  usePlayerStore((state) => state.playerState.isPlaying)

export const usePlayerDuration = () =>
  usePlayerStore((state) => state.playerState.currentDuration)

export const usePlayerSongStarred = () =>
  usePlayerStore((state) => state.playerState.isSongStarred)

export const usePlayerShuffle = () =>
  usePlayerStore((state) => state.playerState.isShuffleActive)

export const usePlayerLoop = () =>
  usePlayerStore((state) => state.playerState.loopState)

export const usePlayerPrevAndNext = () =>
  usePlayerStore(
    (state) => ({
      hasPrev: state.playerState.hasPrev,
      hasNext: state.playerState.hasNext,
    }),
    shallow,
  )

export const usePlayerRef = () =>
  usePlayerStore((state) => state.playerState.audioPlayerRef)

export const getVolume = () => usePlayerStore.getState().playerState.volume

export const useMainDrawerState = () =>
  usePlayerStore(
    (state) => ({
      mainDrawerState: state.playerState.mainDrawerState,
      setMainDrawerState: state.actions.setMainDrawerState,
      setActiveDrawerPanel: state.actions.setActiveDrawerPanel,
      toggleQueueAndLyrics: state.actions.toggleQueueAndLyrics,
      closeDrawer: state.actions.closeDrawer,
    }),
    shallow,
  )

export const useQueueState = () =>
  usePlayerStore(
    (state) => ({
      queueState: state.playerState.queueState,
      setQueueState: state.actions.setQueueState,
      toggleQueueAction: state.actions.toggleQueueAction,
    }),
    shallow,
  )

export const useLyricsState = () =>
  usePlayerStore(
    (state) => ({
      lyricsState: state.playerState.lyricsState,
      setLyricsState: state.actions.setLyricsState,
      toggleLyricsAction: state.actions.toggleLyricsAction,
    }),
    shallow,
  )

export const useSongColor = () =>
  usePlayerStore((state) => {
    const {
      currentSongColor,
      currentSongColorPalette,
      currentSongColorIntensity,
      queue,
    } = state.settings.colors
    const { useSongColor, blur } = state.settings.colors.bigPlayer
    const {
      setCurrentSongColor,
      setCurrentSongColorPalette,
      setUseSongColorOnQueue,
      setUseSongColorOnBigPlayer,
      setBigPlayerBlurValue,
      setCurrentSongIntensity,
    } = state.actions

    return {
      currentSongColor,
      currentSongColorPalette,
      setCurrentSongColor,
      setCurrentSongColorPalette,
      currentSongColorIntensity,
      setCurrentSongIntensity,
      useSongColorOnQueue: queue.useSongColor,
      useSongColorOnBigPlayer: useSongColor,
      setUseSongColorOnQueue,
      setUseSongColorOnBigPlayer,
      bigPlayerBlur: blur,
      setBigPlayerBlurValue,
    }
  })

export const useVisualizerSettingsStore = () =>
  usePlayerStore((state) => ({
    preset: state.settings.visualizer.preset,
    autoQualityEnabled: state.settings.visualizer.autoQualityEnabled,
    setVisualizerPreset: state.actions.setVisualizerPreset,
    setVisualizerAutoQualityEnabled:
      state.actions.setVisualizerAutoQualityEnabled,
  }))

export const usePlayerCurrentList = () =>
  usePlayerStore((state) => state.songlist.currentList)
