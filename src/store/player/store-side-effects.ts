import { shallow } from 'zustand/shallow'
import { useRadioNowPlayingStore } from '@/store/radio-now-playing.store'
import { IPlayerContext } from '@/types/playerContext'
import { isDesktop } from '@/utils/desktop'
import { discordRpc } from '@/utils/discordRpc'
import { rememberSongPlayback } from '@/utils/listening-memory'

type StoreSubscriptionApi = {
  getState: () => IPlayerContext
  subscribe: <TSelected>(
    selector: (state: IPlayerContext) => TSelected,
    listener: (selected: TSelected, prevSelected: TSelected) => void,
    options?: {
      equalityFn?: (a: TSelected, b: TSelected) => boolean
    },
  ) => () => void
}

type PlayerSideEffectDeps = {
  store: StoreSubscriptionApi
  ensureSonaDjNextTrack: () => Promise<void>
  ensureRuntimeShuffleNextTrack: () => Promise<void>
  ensureDaytimeMoodNextTrack: () => Promise<void>
}

let desktopPlayerStateListenerRegistered = false

export function registerPlayerStoreSideEffects({
  store,
  ensureSonaDjNextTrack,
  ensureRuntimeShuffleNextTrack,
  ensureDaytimeMoodNextTrack,
}: PlayerSideEffectDeps) {
  store.subscribe(
    (state) => [
      state.songlist.currentList,
      state.songlist.radioList,
      state.songlist.podcastList,
      state.songlist.currentSongIndex,
    ],
    () => {
      store.getState().actions.updateQueueChecks()
    },
    {
      equalityFn: shallow,
    },
  )

  useRadioNowPlayingStore.subscribe((state, prevState) => {
    if (state.current === prevState.current) return
    discordRpc.sendCurrentSong()
  })

  let plannerTimeout: ReturnType<typeof setTimeout> | null = null

  store.subscribe(
    (state) => [
      state.songlist.currentSongIndex,
      state.songlist.currentSong?.id,
      state.songlist.currentList.length,
      state.playerState.mediaType,
    ],
    () => {
      // Daytime Mood next track can be calculated immediately (uses in-memory cache)
      ensureDaytimeMoodNextTrack().catch(() => undefined)

      if (plannerTimeout) {
        clearTimeout(plannerTimeout)
      }
      plannerTimeout = setTimeout(() => {
        ensureSonaDjNextTrack().catch(() => undefined)
        ensureRuntimeShuffleNextTrack().catch(() => undefined)
      }, 5000)
    },
    {
      equalityFn: shallow,
    },
  )

  store.subscribe(
    (state) => [
      state.songlist.currentSong,
      state.playerState.isPlaying,
      state.playerState.currentDuration,
    ],
    () => {
      discordRpc.sendCurrentSong()
    },
    {
      equalityFn: shallow,
    },
  )

  store.subscribe(
    (state) => [
      state.songlist.currentSong?.id,
      state.songlist.currentSong,
      state.playerState.isPlaying,
      state.playerState.mediaType,
      state.settings.listeningMemory.enabled,
    ],
    ([songId, song, isPlaying, mediaType, listeningMemoryEnabled]) => {
      if (
        !songId ||
        mediaType !== 'song' ||
        !isPlaying ||
        !listeningMemoryEnabled
      )
        return
      rememberSongPlayback(song)
    },
    {
      equalityFn: shallow,
    },
  )

  function desktopStateListener() {
    if (!isDesktop()) return
    if (desktopPlayerStateListenerRegistered) return

    const { togglePlayPause, playPrevSong, playNextSong } =
      store.getState().actions

    window.api.playerStateListener((action) => {
      if (action === 'togglePlayPause') togglePlayPause()
      if (action === 'skipBackwards') playPrevSong()
      if (action === 'skipForward') playNextSong()
    })
    desktopPlayerStateListenerRegistered = true
  }

  function updateDesktopState() {
    if (!isDesktop()) return

    const { isPlaying, hasPrev, hasNext } = store.getState().playerState
    const { currentList, podcastList, radioList } = store.getState().songlist

    const hasSongs = currentList.length >= 1
    const hasPodcasts = podcastList.length >= 1
    const hasRadios = radioList.length >= 1

    window.api.updatePlayerState({
      isPlaying,
      hasPrevious: hasPrev,
      hasNext,
      hasSonglist: hasSongs || hasPodcasts || hasRadios,
    })
  }

  desktopStateListener()
  updateDesktopState()

  store.subscribe(
    (state) => [
      state.playerState.isPlaying,
      state.playerState.hasPrev,
      state.playerState.hasNext,
      state.songlist.currentList,
    ],
    () => {
      updateDesktopState()
    },
    {
      equalityFn: shallow,
    },
  )
}
