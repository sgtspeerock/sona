import { toast } from 'react-toastify'
import i18n from '@/i18n'
import {
  clearDaytimeMoodCache,
  fetchDaytimeMoodSongs,
  getDaytimePeriod,
} from '@/service/daytime-mood-manager'
import { subsonic } from '@/service/subsonic'
import { getSonaDjMode, SonaDjMode } from '@/store/sona-dj.store'
import { SessionMode } from '@/types/playerContext'
import { ISong } from '@/types/responses/song'
import { logger } from '@/utils/logger'
import {
  getListeningMemoryEnabledPreference,
  pickByListeningMemory,
} from '@/utils/listening-memory'
import { addNextSongList } from '@/utils/songListFunctions'
import {
  getSessionGenreSet,
  matchesSessionModeGenre,
  normalizeGenre,
} from '../session-mode-helpers'

const SONA_DJ_POOL_SIZE = 30
const SESSION_MODE_GENRE_PROBE_COUNT = 4
const SESSION_MODE_GENRE_PROBE_SIZE = 10
const RUNTIME_SHUFFLE_LOOKAHEAD = 2
const SONA_DJ_INJECTED_KEY = '__sonaDjInjected'
const QUEUE_SOURCE_KEY = 'queueSource'

export type PlaybackEngineStoreState = {
  songlist: {
    currentList: ISong[]
    originalList: ISong[]
    currentSongIndex: number
    currentSong: ISong
  }
  playerState: {
    mediaType: 'song' | 'radio' | 'podcast'
    isPlaying: boolean
  }
  settings: {
    listeningMemory: {
      enabled: boolean
    }
    sessionMode: {
      mode: SessionMode
      focusGenres: string[]
      nightGenres: string[]
    }
  }
}

export type PlaybackEngineStoreApi = {
  getState: () => PlaybackEngineStoreState
  setState: (recipe: (state: PlaybackEngineStoreState) => void) => void
}

export type PlaybackEngine = ReturnType<typeof createPlaybackEngine>

function stripInjectedSong(song: ISong): ISong {
  const next = { ...song } as Record<string, unknown>
  delete next[SONA_DJ_INJECTED_KEY]
  delete next[QUEUE_SOURCE_KEY]
  return next as ISong
}

function asInjectedSong(song: ISong): ISong {
  return {
    ...song,
    [SONA_DJ_INJECTED_KEY]: true,
    [QUEUE_SOURCE_KEY]: 'dj',
  } as ISong
}

function asSessionSong(song: ISong): ISong {
  return {
    ...song,
    [QUEUE_SOURCE_KEY]: 'session',
  } as ISong
}

function isInjectedSong(song?: ISong): boolean {
  if (!song) return false
  return Boolean((song as Record<string, unknown>)[SONA_DJ_INJECTED_KEY])
}

function shuffleList<T>(list: T[]) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

function getDecade(year?: number) {
  if (!year || Number.isNaN(year)) return null
  return Math.floor(year / 10) * 10
}

export function createPlaybackEngine(store: PlaybackEngineStoreApi) {
  let runtimeSonaDjMode: SonaDjMode | null = null
  let runtimeShuffleAllEnabled = false
  let sonaDjPlannerInFlight = false
  let runtimeShufflePlannerInFlight = false

  const getSessionMode = () => store.getState().settings.sessionMode.mode
  const getRuntimeSonaDjMode = () => runtimeSonaDjMode ?? getSonaDjMode()
  const getRuntimeShuffleAllEnabled = () => runtimeShuffleAllEnabled
  const listeningMemoryEnabled = () =>
    store.getState().settings.listeningMemory.enabled ??
    getListeningMemoryEnabledPreference()

  const applySessionModeFilter = (songs: ISong[]) => {
    const mode = getSessionMode()
    if (mode === 'off') return songs

    const settings = store.getState().settings.sessionMode
    return songs.filter((song) =>
      matchesSessionModeGenre(
        song,
        mode,
        settings.focusGenres,
        settings.nightGenres,
      ),
    )
  }

  const clearInjectedSongs = () => {
    store.setState((state) => {
      state.songlist.currentList =
        state.songlist.currentList.map(stripInjectedSong)
      state.songlist.originalList =
        state.songlist.originalList.map(stripInjectedSong)
    })
  }

  const setRuntimeMode = (mode: SonaDjMode) => {
    runtimeSonaDjMode = mode
  }

  const setRuntimeShuffleEnabled = (value: boolean) => {
    runtimeShuffleAllEnabled = value
  }

  const getSonaDjCandidate = async (
    mode: SonaDjMode,
    currentSong: ISong,
    currentList: ISong[],
  ) => {
    const sourceGenre = normalizeGenre(currentSong.genre)
    const sourceDecade = getDecade(currentSong.year)
    const sourceArtist = (currentSong.artist ?? '').trim().toLowerCase()
    const currentIds = new Set(currentList.map((song) => song.id))

    const randomSongs = await subsonic.songs.getRandomSongs({
      size: SONA_DJ_POOL_SIZE,
    })

    let candidatePool = applySessionModeFilter(randomSongs ?? [])

    if (candidatePool.length === 0) {
      const fallbackSongs = await subsonic.songs.getAllSongs(500)
      candidatePool = applySessionModeFilter(fallbackSongs)
        .sort(() => Math.random() - 0.5)
        .slice(0, SONA_DJ_POOL_SIZE)
    }

    const candidates = candidatePool.filter(
      (song) => !currentIds.has(song.id) && song.id !== currentSong.id,
    )

    let songToInject: ISong | undefined

    if (mode === SonaDjMode.Era && sourceDecade !== null) {
      const eraCandidates = candidates.filter((song) => {
        const candidateDecade = getDecade(song.year)
        return candidateDecade === sourceDecade
      })
      songToInject = pickByListeningMemory(
        eraCandidates,
        listeningMemoryEnabled(),
      )
    } else if (mode === SonaDjMode.Adventure || mode === SonaDjMode.Drift) {
      const contrastCandidates = candidates.filter((song) => {
        const candidateGenre = normalizeGenre(song.genre)
        return (
          candidateGenre.length > 0 &&
          sourceGenre.length > 0 &&
          candidateGenre !== sourceGenre
        )
      })
      songToInject = pickByListeningMemory(
        contrastCandidates,
        listeningMemoryEnabled(),
      )
    }

    if (
      !songToInject &&
      (mode === SonaDjMode.Adventure || mode === SonaDjMode.Drift)
    ) {
      if (sourceDecade !== null) {
        const byLargestDecadeDistance = [...candidates]
          .filter((song) => getDecade(song.year) !== null)
          .sort((a, b) => {
            const aDistance = Math.abs(
              (getDecade(a.year) ?? sourceDecade) - sourceDecade,
            )
            const bDistance = Math.abs(
              (getDecade(b.year) ?? sourceDecade) - sourceDecade,
            )
            return bDistance - aDistance
          })

        songToInject = pickByListeningMemory(
          byLargestDecadeDistance,
          listeningMemoryEnabled(),
        )
      }
    }

    if (
      !songToInject &&
      (mode === SonaDjMode.Adventure || mode === SonaDjMode.Drift)
    ) {
      const artistCandidates = candidates.filter((song) => {
        const artist = (song.artist ?? '').trim().toLowerCase()
        return (
          artist.length > 0 &&
          sourceArtist.length > 0 &&
          artist !== sourceArtist
        )
      })
      songToInject = pickByListeningMemory(
        artistCandidates,
        listeningMemoryEnabled(),
      )
    }

    if (songToInject) return songToInject
    if (candidates[0]) {
      return (
        pickByListeningMemory(candidates, listeningMemoryEnabled()) ??
        candidates[0]
      )
    }

    const reusable = candidatePool.filter((song) => song.id !== currentSong.id)
    return (
      pickByListeningMemory(reusable, listeningMemoryEnabled()) ?? reusable[0]
    )
  }

  const queueSonaDjTrack = (mode: SonaDjMode, songToInject: ISong) => {
    const { currentList, currentSongIndex, currentSong, originalList } =
      store.getState().songlist
    const injectedSong = asInjectedSong(songToInject)

    if (mode === SonaDjMode.Drift || mode === SonaDjMode.Era) {
      const nextList = addNextSongList(currentSongIndex, currentList, [
        injectedSong,
      ])

      const indexOnOriginalList = originalList.findIndex(
        (song) => song.id === currentSong.id,
      )
      const nextOriginalList =
        indexOnOriginalList >= 0
          ? addNextSongList(indexOnOriginalList, originalList, [songToInject])
          : [...originalList, songToInject]

      store.setState((state) => {
        state.songlist.currentList = nextList
        state.songlist.originalList = nextOriginalList
      })
      return
    }

    const newCurrentList = addNextSongList(currentSongIndex, currentList, [
      injectedSong,
    ])
    const indexOnOriginalList = originalList.findIndex(
      (song) => song.id === currentSong.id,
    )
    const newOriginalList =
      indexOnOriginalList >= 0
        ? addNextSongList(indexOnOriginalList, originalList, [songToInject])
        : [...originalList, songToInject]

    store.setState((state) => {
      state.songlist.currentList = newCurrentList
      state.songlist.originalList = newOriginalList
    })
  }

  const getEmergencySonaDjFallback = (currentSong: ISong) => {
    const { currentList, originalList } = store.getState().songlist
    const pool = [...currentList, ...originalList]
    return pool.find((song) => song.id !== currentSong.id)
  }

  const ensureSonaDjNextTrack = async () => {
    if (sonaDjPlannerInFlight) return

    const state = store.getState()
    const mode = getRuntimeSonaDjMode()
    if (mode === SonaDjMode.Off) return
    if (state.playerState.mediaType !== 'song') return

    const { currentSong, currentList, currentSongIndex } = state.songlist
    if (!currentSong?.id) return

    const nextSong = currentList[currentSongIndex + 1]
    const currentSongIsInjected = isInjectedSong(currentSong)
    const nextSongIsInjected = isInjectedSong(nextSong)

    if (mode === SonaDjMode.Adventure && currentSongIsInjected) return
    if (nextSongIsInjected) return

    sonaDjPlannerInFlight = true
    try {
      const songToInject = await getSonaDjCandidate(
        mode,
        currentSong,
        currentList,
      )
      const fallback =
        mode === SonaDjMode.Adventure
          ? (songToInject ?? getEmergencySonaDjFallback(currentSong))
          : (songToInject ??
            getEmergencySonaDjFallback(currentSong) ??
            currentSong)

      if (fallback) queueSonaDjTrack(mode, fallback)
    } catch {
      const fallback =
        mode === SonaDjMode.Adventure
          ? getEmergencySonaDjFallback(currentSong)
          : (getEmergencySonaDjFallback(currentSong) ?? currentSong)
      if (fallback) queueSonaDjTrack(mode, fallback)
    } finally {
      sonaDjPlannerInFlight = false
    }
  }

  const getStrictSessionCandidates = async (mode: SessionMode) => {
    const settings = store.getState().settings.sessionMode
    const allowedGenres = getSessionGenreSet(
      mode,
      settings.focusGenres,
      settings.nightGenres,
    )
    if (!allowedGenres || allowedGenres.size === 0) return []

    const sampledGenres = shuffleList([...allowedGenres]).slice(
      0,
      Math.min(SESSION_MODE_GENRE_PROBE_COUNT, allowedGenres.size),
    )

    const pooled = await Promise.all(
      sampledGenres.map((genre) =>
        subsonic.songs
          .getRandomSongs({
            genre,
            size: SESSION_MODE_GENRE_PROBE_SIZE,
          })
          .catch(() => []),
      ),
    )

    const pooledSongs = pooled.flat().filter(Boolean) as ISong[]
    if (pooledSongs.length > 0) return pooledSongs

    const fallbackSongs = await subsonic.songs.getAllSongs(5000)
    return applySessionModeFilter(fallbackSongs)
  }

  const getRuntimeRandomSong = async (
    currentSong?: ISong,
    excludedIds?: Set<string>,
  ) => {
    const sessionMode = getSessionMode()
    const strictSessionFilter = sessionMode !== 'off'

    if (strictSessionFilter) {
      const strictCandidates = await getStrictSessionCandidates(sessionMode)
      const eligibleStrictCandidates = strictCandidates.filter(
        (song) => song.id !== currentSong?.id && !excludedIds?.has(song.id),
      )
      const strictSong = pickByListeningMemory(
        eligibleStrictCandidates,
        listeningMemoryEnabled(),
      )
      if (strictSong) return strictSong
      return undefined
    }

    const randomSongs = await subsonic.songs.getRandomSongs({
      size: SONA_DJ_POOL_SIZE,
    })
    const eligibleRandomSongs = applySessionModeFilter(
      randomSongs ?? [],
    ).filter(
      (song) => song.id !== currentSong?.id && !excludedIds?.has(song.id),
    )
    const randomSong = pickByListeningMemory(
      eligibleRandomSongs,
      listeningMemoryEnabled(),
    )
    if (randomSong) return randomSong

    const unfilteredRandomSongs = (randomSongs ?? []).filter(
      (song) => song.id !== currentSong?.id && !excludedIds?.has(song.id),
    )
    const unfilteredRandomSong = pickByListeningMemory(
      unfilteredRandomSongs,
      listeningMemoryEnabled(),
    )
    if (unfilteredRandomSong) return unfilteredRandomSong

    const fallbackSongs = await subsonic.songs.getAllSongs(200)
    const eligibleFallbackSongs = applySessionModeFilter(fallbackSongs).filter(
      (song) => song.id !== currentSong?.id && !excludedIds?.has(song.id),
    )
    const fallbackSong = pickByListeningMemory(
      eligibleFallbackSongs,
      listeningMemoryEnabled(),
    )
    if (fallbackSong) return fallbackSong

    const unfilteredFallbackSongs = fallbackSongs.filter(
      (song) => song.id !== currentSong?.id && !excludedIds?.has(song.id),
    )
    return pickByListeningMemory(
      unfilteredFallbackSongs,
      listeningMemoryEnabled(),
    )
  }

  const ensureRuntimeShuffleNextTrack = async () => {
    if (runtimeShufflePlannerInFlight) return
    if (!getRuntimeShuffleAllEnabled()) return

    const state = store.getState()
    if (state.playerState.mediaType !== 'song') return

    const { currentList, currentSongIndex, currentSong, originalList } =
      state.songlist
    const activeSong = currentSong ?? currentList[currentSongIndex]
    if (!activeSong?.id) return

    const songsAhead = Math.max(0, currentList.length - currentSongIndex - 1)
    const songsToAppend = RUNTIME_SHUFFLE_LOOKAHEAD - songsAhead
    if (songsToAppend <= 0) return

    runtimeShufflePlannerInFlight = true
    try {
      const appendedSongs: ISong[] = []
      const strictSessionFilter = getSessionMode() !== 'off'

      for (let i = 0; i < songsToAppend; i++) {
        const excludedIds = new Set([
          ...currentList.map((song) => song.id),
          ...appendedSongs.map((song) => song.id),
        ])

        let randomSong = await getRuntimeRandomSong(activeSong, excludedIds)
        if (!randomSong && strictSessionFilter) {
          randomSong = await getRuntimeRandomSong(activeSong)
        }
        if (!randomSong) break
        appendedSongs.push(
          strictSessionFilter ? asSessionSong(randomSong) : randomSong,
        )
      }

      if (appendedSongs.length === 0) {
        if (strictSessionFilter) {
          setRuntimeShuffleEnabled(false)
          toast.warn(i18n.t('player.runtimeShuffle.noSessionMatches'))
        }
        return
      }

      const newCurrentList = addNextSongList(
        currentSongIndex,
        currentList,
        appendedSongs,
      )
      const indexOnOriginalList = originalList.findIndex(
        (song) => song.id === currentSong.id,
      )
      const newOriginalList =
        indexOnOriginalList >= 0
          ? addNextSongList(indexOnOriginalList, originalList, appendedSongs)
          : [...originalList, ...appendedSongs]

      store.setState((nextState) => {
        nextState.songlist.currentList = newCurrentList
        nextState.songlist.originalList = newOriginalList
      })
    } finally {
      runtimeShufflePlannerInFlight = false
    }
  }

  const seedSonaDjTrack = async (mode?: SonaDjMode) => {
    const selectedMode = mode ?? getSonaDjMode()
    setRuntimeMode(selectedMode)
    setRuntimeShuffleEnabled(false)
    if (selectedMode === SonaDjMode.Off) return
    await ensureSonaDjNextTrack()
  }

  const startRuntimeShuffleAll = async () => {
    setRuntimeMode(SonaDjMode.Off)
    setRuntimeShuffleEnabled(true)
    clearInjectedSongs()

    const { currentSong, currentList, currentSongIndex } =
      store.getState().songlist
    const activeSong = currentSong ?? currentList[currentSongIndex]
    const sessionMode = getSessionMode()

    let firstSong = await getRuntimeRandomSong()
    if (!firstSong && sessionMode !== 'off' && activeSong?.id) {
      if (matchesSessionModeGenre(activeSong, sessionMode))
        firstSong = activeSong
    }

    if (!firstSong) {
      setRuntimeShuffleEnabled(false)
      return [] as ISong[]
    }

    const secondSong = await getRuntimeRandomSong(
      firstSong,
      new Set([firstSong.id]),
    )
    if (sessionMode !== 'off') {
      const seededFirst = asSessionSong(firstSong)
      return secondSong
        ? [seededFirst, asSessionSong(secondSong)]
        : [seededFirst]
    }
    return secondSong ? [firstSong, secondSong] : [firstSong]
  }

  let currentPeriodKey: string | null = null
  let daytimeMoodPlannerInFlight = false

  const ensureDaytimeMoodNextTrack = async () => {
    if (daytimeMoodPlannerInFlight) return
    const state = store.getState()
    if (!state.playerState.isDaytimeMoodActive) return
    if (state.playerState.mediaType !== 'song') return

    const { currentList, currentSongIndex } = state.songlist
    const songsAhead = Math.max(0, currentList.length - currentSongIndex - 1)

    // Clear old mood queue if time of day changes
    const currentPeriod = getDaytimePeriod()
    if (currentPeriodKey && currentPeriodKey !== currentPeriod) {
      logger.info(`[DaytimeMood] Period shifted from ${currentPeriodKey} to ${currentPeriod}. Recalculating queue...`)
      store.setState((draft) => {
        draft.songlist.currentList = draft.songlist.currentList.slice(0, draft.songlist.currentSongIndex + 1)
        draft.songlist.originalList = draft.songlist.originalList.slice(0, draft.songlist.currentSongIndex + 1)
      })
      clearDaytimeMoodCache()
      state.actions.updateQueueChecks()
    }
    currentPeriodKey = currentPeriod

    // Maintain a lookahead of 8 songs
    if (songsAhead >= 8) return

    daytimeMoodPlannerInFlight = true
    try {
      const { enabled: aiEnabled, apiKey: aiApiKey } = state.settings.ai
      const periodSongs = await fetchDaytimeMoodSongs(aiEnabled, aiApiKey)
      if (periodSongs && periodSongs.length > 0) {
        const countNeeded = 8 - songsAhead
        const addedSongs: Song[] = []
        const currentExcluded = new Set([
          ...currentList.map((song) => song.id),
          ...addedSongs.map((song) => song.id),
        ])

        for (let i = 0; i < countNeeded; i++) {
          const candidates = periodSongs.filter((song) => !currentExcluded.has(song.id))
          const nextSong = candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : periodSongs[Math.floor(Math.random() * periodSongs.length)]

          if (nextSong) {
            addedSongs.push(nextSong)
            currentExcluded.add(nextSong.id)
          }
        }

        if (addedSongs.length > 0) {
          store.setState((draft) => {
            draft.songlist.currentList.push(...addedSongs)
            draft.songlist.originalList.push(...addedSongs)
          })
          state.actions.updateQueueChecks()
        }
      }
    } catch (e) {
      console.error('[DaytimeMood] ensureDaytimeMoodNextTrack error:', e)
    } finally {
      daytimeMoodPlannerInFlight = false
    }
  }

  return {
    clearInjectedSongs,
    setRuntimeMode,
    getRuntimeMode: getRuntimeSonaDjMode,
    setRuntimeShuffleEnabled,
    getRuntimeShuffleEnabled: getRuntimeShuffleAllEnabled,
    seedSonaDjTrack,
    startRuntimeShuffleAll,
    ensureSonaDjNextTrack,
    ensureRuntimeShuffleNextTrack,
    ensureDaytimeMoodNextTrack,
  }
}
