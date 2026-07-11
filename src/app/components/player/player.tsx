import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { getCoverArtUrl, getSongStreamUrl } from '@/api/httpClient'
import { SonaDjButton } from '@/app/components/fullscreen/sona-dj'
import { RadioInfo } from '@/app/components/player/radio-info'
import { TrackInfo } from '@/app/components/player/track-info'

import { useRenderCounter } from '@/app/hooks/use-render-counter'
import { subsonic } from '@/service/subsonic'
import {
  useCrossfadeSettings,
  usePlayerActions,
  usePlayerIsPlaying,
  usePlayerLoop,
  usePlayerMediaType,
  usePlayerPrevAndNext,
  usePlayerSonglist,
  usePlayerStore,
  useReplayGainState,
  useSongColor,
} from '@/store/player.store'
import { useScrobbleStatusStore } from '@/store/scrobble.store'
import { LoopState } from '@/types/playerContext'
import { getAverageColor } from '@/utils/getAverageColor'
import { logger } from '@/utils/logger'
import { ReplayGainParams } from '@/utils/replayGain'
import { AudioPlayer } from './audio'
import { PlayerClearQueueButton } from './clear-queue-button'
import { PlayerControls } from './controls'
import { PlayerLikeButton } from './like-button'
import { PlayerLyricsButton } from './lyrics-button'
import { PlaybackRail } from './playback-rail'
import { PlayerProgress } from './progress'
import { PlayerQueueButton } from './queue-button'
import { PlayerVolume } from './volume'

const MemoTrackInfo = memo(TrackInfo)
const MemoRadioInfo = memo(RadioInfo)
const MemoPlayerControls = memo(PlayerControls)
const MemoPlayerProgress = memo(PlayerProgress)
const MemoPlayerLikeButton = memo(PlayerLikeButton)
const MemoPlayerQueueButton = memo(PlayerQueueButton)
const MemoPlayerClearQueueButton = memo(PlayerClearQueueButton)
const MemoPlayerVolume = memo(PlayerVolume)
const MemoLyricsButton = memo(PlayerLyricsButton)
const MemoAudioPlayer = memo(AudioPlayer)

type DeckId = 'a' | 'b'
type CrossfadeState = 'idle' | 'arming' | 'fading' | 'committing' | 'failed'

function cappedMapSet<K, V>(map: Map<K, V>, key: K, value: V, maxSize = 50) {
  if (map.has(key)) map.delete(key)
  map.set(key, value)
  if (map.size > maxSize) {
    const oldestKey = map.keys().next().value as K | undefined
    if (oldestKey !== undefined) map.delete(oldestKey)
  }
}

export function Player({ hideUi = false }: { hideUi?: boolean }) {
  useRenderCounter('Player')
  const songDeckARef = useRef<HTMLAudioElement>(null)
  const songDeckBRef = useRef<HTMLAudioElement>(null)
  const radioRef = useRef<HTMLAudioElement>(null)
  const crossfadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  )
  const crossfadeRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const fadeOutStartedRef = useRef(false)
  const isCrossfadingRef = useRef(false)
  const crossfadeCommitRef = useRef(false)
  const crossfadeCommitTargetRef = useRef<{
    deck: DeckId
    index: number
  } | null>(null)
  const incomingDeckRef = useRef<DeckId | null>(null)
  const incomingSongIndexRef = useRef<number | null>(null)
  const crossfadeStateRef = useRef<CrossfadeState>('idle')
  const crossfadeRetryRef = useRef(0)
  const activeDeckRef = useRef<DeckId>('a')
  const [activeDeck, setActiveDeck] = useState<DeckId>('a')
  const [incomingDeck, setIncomingDeck] = useState<DeckId | null>(null)
  const [deckAIndex, setDeckAIndex] = useState<number | null>(null)
  const [deckBIndex, setDeckBIndex] = useState<number | null>(null)
  const [deckVolumeMultipliers, setDeckVolumeMultipliers] = useState<{
    a: number
    b: number
  }>({ a: 1, b: 0 })
  const coverImageCacheRef = useRef<Map<string, string>>(new Map())
  const coverColorCacheRef = useRef<Map<string, string>>(new Map())

  const {
    setAudioPlayerRef,
    setCurrentDuration,
    setProgress,
    setPlayingState,
    handleSongEnded,
    getCurrentProgress,
    advanceToNextSongWithoutReset,
  } = usePlayerActions()
  const setScrobbleStatus = useScrobbleStatusStore((state) => state.setStatus)
  const { currentList, currentSongIndex, radioList } = usePlayerSonglist()
  const isPlaying = usePlayerIsPlaying()
  const { isSong, isRadio } = usePlayerMediaType()
  const loopState = usePlayerLoop()
  const { hasNext } = usePlayerPrevAndNext()
  const { setCurrentSongColor } = useSongColor()
  const _currentPlaybackRate = usePlayerStore(
    (state) => state.playerState.currentPlaybackRate,
  )
  const { replayGainType, replayGainPreAmp, replayGainDefaultGain } =
    useReplayGainState()
  const useRightRailLayout = true
  const {
    enabled: crossfadeEnabled,
    durationSeconds: crossfadeDurationSetting,
  } = useCrossfadeSettings()
  const crossfadeDurationSeconds = Math.min(
    8,
    Math.max(2, crossfadeDurationSetting || 3),
  )

  const MAX_CROSSFADE_RETRIES = 2
  const CROSSFADE_RETRY_DELAY_MS = 150

  const song = currentList[currentSongIndex]
  const radio = radioList[currentSongIndex]
  const deckASong = deckAIndex !== null ? currentList[deckAIndex] : undefined
  const deckBSong = deckBIndex !== null ? currentList[deckBIndex] : undefined

  const setDeckLevels = useCallback((nextA: number, nextB: number) => {
    setDeckVolumeMultipliers((prev) => {
      if (
        Math.abs(prev.a - nextA) < 0.001 &&
        Math.abs(prev.b - nextB) < 0.001
      ) {
        return prev
      }
      return { a: nextA, b: nextB }
    })
  }, [])

  const getDeckRef = useCallback(
    (deck: DeckId) => (deck === 'a' ? songDeckARef : songDeckBRef),
    [],
  )

  const getActiveSongDeckRef = useCallback(
    () => (activeDeck === 'a' ? songDeckARef : songDeckBRef),
    [activeDeck],
  )

  useEffect(() => {
    activeDeckRef.current = activeDeck
  }, [activeDeck])

  useEffect(() => {
    if (!isSong || isCrossfadingRef.current) return
    if (activeDeck === 'a') {
      setDeckLevels(1, 0)
      return
    }
    setDeckLevels(0, 1)
  }, [activeDeck, isSong, setDeckLevels])

  const clearFade = useCallback(() => {
    if (crossfadeIntervalRef.current !== null) {
      clearInterval(crossfadeIntervalRef.current)
      crossfadeIntervalRef.current = null
    }
    if (crossfadeRetryTimeoutRef.current !== null) {
      clearTimeout(crossfadeRetryTimeoutRef.current)
      crossfadeRetryTimeoutRef.current = null
    }
  }, [])

  const getAudioRef = useCallback(() => {
    if (isRadio) return radioRef
    return getActiveSongDeckRef()
  }, [getActiveSongDeckRef, isRadio])

  const getNextSongIndex = useCallback(() => {
    if (hasNext) return currentSongIndex + 1
    if (loopState === LoopState.All && currentList.length > 0) return 0
    return null
  }, [currentList.length, currentSongIndex, hasNext, loopState])

  // Keep deck assignment synced when user changes track manually.
  useEffect(() => {
    if (!isSong) {
      setDeckAIndex(null)
      setDeckBIndex(null)
      setDeckLevels(1, 0)
      isCrossfadingRef.current = false
      incomingDeckRef.current = null
      incomingSongIndexRef.current = null
      crossfadeCommitTargetRef.current = null
      setIncomingDeck(null)
      fadeOutStartedRef.current = false
      crossfadeStateRef.current = 'idle'
      crossfadeRetryRef.current = 0
      clearFade()
      return
    }

    const pendingCommitTarget = crossfadeCommitTargetRef.current
    if (pendingCommitTarget && crossfadeCommitRef.current) {
      const commitReached =
        activeDeck === pendingCommitTarget.deck &&
        currentSongIndex === pendingCommitTarget.index
      if (!commitReached) return
      crossfadeCommitRef.current = false
      crossfadeCommitTargetRef.current = null
      incomingSongIndexRef.current = null
      return
    }

    setDeckAIndex((prev) => (activeDeck === 'a' ? currentSongIndex : prev))
    setDeckBIndex((prev) => (activeDeck === 'b' ? currentSongIndex : prev))

    if (activeDeck === 'a') setDeckBIndex(null)
    if (activeDeck === 'b') setDeckAIndex(null)

    isCrossfadingRef.current = false
    incomingDeckRef.current = null
    incomingSongIndexRef.current = null
    crossfadeCommitTargetRef.current = null
    setIncomingDeck(null)
    fadeOutStartedRef.current = false
    crossfadeStateRef.current = 'idle'
    crossfadeRetryRef.current = 0
    clearFade()
  }, [activeDeck, clearFade, currentSongIndex, isSong, setDeckLevels])

  // Keep active song deck as the source for progress/volume/visualizer.
  useEffect(() => {
    if (!isSong) return
    const activeRef = getActiveSongDeckRef().current
    if (activeRef) {
      setAudioPlayerRef(activeRef)
    }
  }, [getActiveSongDeckRef, isSong, setAudioPlayerRef])

  useEffect(() => {
    if (crossfadeEnabled || !isSong) return
    clearFade()
    incomingDeckRef.current = null
    incomingSongIndexRef.current = null
    crossfadeCommitTargetRef.current = null
    setIncomingDeck(null)
    isCrossfadingRef.current = false
    fadeOutStartedRef.current = false
    crossfadeStateRef.current = 'idle'
    crossfadeRetryRef.current = 0
    if (activeDeck === 'a') setDeckLevels(1, 0)
    if (activeDeck === 'b') setDeckLevels(0, 1)
    if (activeDeck === 'a') setDeckBIndex(null)
    if (activeDeck === 'b') setDeckAIndex(null)
  }, [activeDeck, clearFade, crossfadeEnabled, isSong, setDeckLevels])

  useEffect(() => {
    if (!isSong || !isCrossfadingRef.current || !incomingDeck) return
    if (crossfadeIntervalRef.current !== null) return

    const outgoingDeck = activeDeck
    const nextDeck = incomingDeck
    const outgoingAudio = getDeckRef(outgoingDeck).current
    const incomingAudio = getDeckRef(nextDeck).current

    if (!outgoingAudio || !incomingAudio) return

    const durationMs = crossfadeDurationSeconds * 1000
    const steps = Math.max(20, Math.floor(durationMs / 30))
    const stepMs = Math.max(16, Math.floor(durationMs / steps))
    let step = 0
    crossfadeStateRef.current = 'fading'

    setDeckLevels(outgoingDeck === 'a' ? 1 : 0, outgoingDeck === 'b' ? 1 : 0)
    let aborted = false
    const finalizeFallback = () => {
      if (aborted) return
      clearFade()
      incomingDeckRef.current = null
      incomingSongIndexRef.current = null
      crossfadeCommitTargetRef.current = null
      setIncomingDeck(null)
      isCrossfadingRef.current = false
      fadeOutStartedRef.current = false
      crossfadeStateRef.current = 'idle'
      crossfadeRetryRef.current = 0
      if (activeDeckRef.current === 'a') setDeckLevels(1, 0)
      if (activeDeckRef.current === 'b') setDeckLevels(0, 1)
      advanceToNextSongWithoutReset()
    }

    const startCrossfadeInterval = () => {
      if (crossfadeIntervalRef.current !== null) return

      crossfadeIntervalRef.current = setInterval(() => {
        if (aborted) return
        step += 1
        const progress = Math.min(1, step / steps)
        const angle = progress * (Math.PI / 2)
        const outgoingLevel = Math.cos(angle)
        const incomingLevel = Math.sin(angle)
        setDeckLevels(
          outgoingDeck === 'a' ? outgoingLevel : incomingLevel,
          outgoingDeck === 'b' ? outgoingLevel : incomingLevel,
        )

        if (progress >= 1) {
          clearFade()
          crossfadeStateRef.current = 'committing'

          outgoingAudio.pause()
          outgoingAudio.currentTime = 0

          const committedIndex = incomingSongIndexRef.current
          if (committedIndex !== null) {
            crossfadeCommitRef.current = true
            crossfadeCommitTargetRef.current = {
              deck: nextDeck,
              index: committedIndex,
            }
          }
          activeDeckRef.current = nextDeck
          setActiveDeck(nextDeck)
          if (nextDeck === 'a') setDeckBIndex(null)
          if (nextDeck === 'b') setDeckAIndex(null)

          incomingDeckRef.current = null
          incomingSongIndexRef.current = null
          setIncomingDeck(null)
          isCrossfadingRef.current = false
          fadeOutStartedRef.current = false
          crossfadeStateRef.current = 'idle'
          crossfadeRetryRef.current = 0
          setDeckLevels(nextDeck === 'a' ? 1 : 0, nextDeck === 'b' ? 1 : 0)

          advanceToNextSongWithoutReset()
          setAudioPlayerRef(incomingAudio)
          setPlayingState(true)
          if (incomingAudio.paused) {
            incomingAudio.play().catch(() => undefined)
          }
          if (Number.isFinite(incomingAudio.duration)) {
            setCurrentDuration(Math.floor(incomingAudio.duration))
          }
          setProgress(Math.floor(incomingAudio.currentTime))
        }
      }, stepMs)
    }

    const attemptPlayIncoming = () => {
      incomingAudio
        .play()
        .then(() => {
          if (aborted) return
          startCrossfadeInterval()
        })
        .catch(() => {
          if (aborted) return
          if (crossfadeRetryRef.current < MAX_CROSSFADE_RETRIES) {
            crossfadeRetryRef.current += 1
            crossfadeRetryTimeoutRef.current = setTimeout(
              attemptPlayIncoming,
              CROSSFADE_RETRY_DELAY_MS * (crossfadeRetryRef.current + 1),
            )
            return
          }
          finalizeFallback()
        })
    }
    if (isPlaying) {
      attemptPlayIncoming()
    } else {
      finalizeFallback()
    }

    return () => {
      aborted = true
    }
  }, [
    activeDeck,
    clearFade,
    getDeckRef,
    incomingDeck,
    isPlaying,
    isSong,
    crossfadeDurationSeconds,
    advanceToNextSongWithoutReset,
    setAudioPlayerRef,
    setCurrentDuration,
    setDeckLevels,
    setProgress,
    setPlayingState,
  ])

  // Get album cover URL for background
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

  const prefetchSongVisuals = useCallback(
    async (coverArt?: string, songId?: string) => {
      if (!coverArt || !songId) return
      if (
        coverImageCacheRef.current.has(songId) &&
        coverColorCacheRef.current.has(songId)
      ) {
        return
      }

      try {
        const imageUrl =
          coverImageCacheRef.current.get(songId) ??
          (await getCoverArtUrl(coverArt, 'song', '400'))
        cappedMapSet(coverImageCacheRef.current, songId, imageUrl)

        if (coverColorCacheRef.current.has(songId)) return

        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('image-load-failed'))
          img.src = imageUrl
        })
        const average = await getAverageColor(img)
        cappedMapSet(coverColorCacheRef.current, songId, average.hex)
      } catch (error) {
        logger.debug('[Player] - Failed to prefetch song visuals', {
          songId,
          error,
        })
      }
    },
    [],
  )

  useEffect(() => {
    const loadBackgroundImage = async () => {
      if (isSong && song?.coverArt && song?.id) {
        try {
          const cached = coverImageCacheRef.current.get(song.id)
          const imageUrl =
            cached ?? (await getCoverArtUrl(song.coverArt, 'song', '400'))
          cappedMapSet(coverImageCacheRef.current, song.id, imageUrl)
          setBackgroundImage(imageUrl)

          const cachedColor = coverColorCacheRef.current.get(song.id)
          if (cachedColor) {
            setCurrentSongColor(cachedColor)
          }
        } catch (error) {
          console.error('Error loading background image:', error)
          setBackgroundImage(null)
        }
      } else {
        setBackgroundImage(null)
      }
    }

    loadBackgroundImage()
  }, [isSong, setCurrentSongColor, song?.coverArt, song?.id])

  useEffect(() => {
    if (!isSong || !crossfadeEnabled) return
    const nextSongIndex = getNextSongIndex()
    if (nextSongIndex === null) return

    const nextSong = currentList[nextSongIndex]
    if (!nextSong?.coverArt || !nextSong?.id) return

    prefetchSongVisuals(nextSong.coverArt, nextSong.id)
  }, [
    crossfadeEnabled,
    currentList,
    getNextSongIndex,
    isSong,
    prefetchSongVisuals,
  ])

  const setupDuration = useCallback(
    (deck?: DeckId) => {
      const audio =
        isSong && deck ? getDeckRef(deck).current : getAudioRef().current
      if (!audio) return

      const audioDuration = Math.floor(audio.duration)
      const infinityDuration = audioDuration === Infinity

      if (!infinityDuration) {
        if (!isSong || !deck || deck === activeDeckRef.current) {
          setCurrentDuration(audioDuration)
        }
      }

      if (isSong && crossfadeEnabled) {
        if (isSong && deck && deck !== activeDeckRef.current) {
          audio.currentTime = 0
        }
        if (!Number.isFinite(audio.currentTime) || audio.currentTime < 0) {
          audio.currentTime = 0
        }
        return
      }

      if (isSong && deck && deck !== activeDeckRef.current) {
        audio.currentTime = 0
      } else {
        const progress = getCurrentProgress()
        audio.currentTime = progress
      }
    },
    [
      getAudioRef,
      getCurrentProgress,
      getDeckRef,
      isSong,
      crossfadeEnabled,
      setCurrentDuration,
    ],
  )

  const setupProgress = useCallback(
    (deck?: DeckId) => {
      const audio =
        isSong && deck ? getDeckRef(deck).current : getAudioRef().current
      if (!audio) return

      if (isSong && deck && deck !== activeDeckRef.current) return

      const currentProgress = Math.floor(audio.currentTime)
      setProgress(currentProgress)

      if (!crossfadeEnabled || !isSong) return
      if (isCrossfadingRef.current || fadeOutStartedRef.current) return
      if (
        !Number.isFinite(audio.duration) ||
        audio.duration <= crossfadeDurationSeconds * 2
      ) {
        return
      }

      const nextSongIndex = getNextSongIndex()
      if (nextSongIndex === null) return
      if (!currentList[nextSongIndex]) return

      const timeLeft = audio.duration - audio.currentTime
      if (timeLeft > 0 && timeLeft <= crossfadeDurationSeconds) {
        const incomingDeck: DeckId = activeDeck === 'a' ? 'b' : 'a'
        const incomingSong = currentList[nextSongIndex]

        if (incomingSong?.coverArt && incomingSong?.id) {
          prefetchSongVisuals(incomingSong.coverArt, incomingSong.id)
        }

        if (incomingSong?.id) {
          setScrobbleStatus('sending-now', incomingSong.id)
          subsonic.scrobble
            .sendNowPlaying(incomingSong.id)
            .then(() => {
              setScrobbleStatus('now-ok', incomingSong.id)
            })
            .catch((error) => {
              setScrobbleStatus('now-failed', incomingSong.id)
              logger.warn('Now playing request failed (crossfade)', error)
            })
        }

        crossfadeStateRef.current = 'arming'
        fadeOutStartedRef.current = true
        isCrossfadingRef.current = true
        incomingDeckRef.current = incomingDeck
        incomingSongIndexRef.current = nextSongIndex
        setIncomingDeck(incomingDeck)

        if (incomingDeck === 'a') setDeckAIndex(nextSongIndex)
        if (incomingDeck === 'b') setDeckBIndex(nextSongIndex)
      }
    },
    [
      activeDeck,
      crossfadeEnabled,
      crossfadeDurationSeconds,
      currentList,
      getAudioRef,
      getDeckRef,
      getNextSongIndex,
      isSong,
      prefetchSongVisuals,
      setScrobbleStatus,
      setProgress,
    ],
  )

  const setupInitialVolume = useCallback(
    (deck?: DeckId) => {
      if (!isSong || !deck) return
      if (deck === 'a') {
        setDeckLevels(
          activeDeckRef.current === 'a' && !isCrossfadingRef.current ? 1 : 0,
          deckVolumeMultipliers.b,
        )
        return
      }
      setDeckLevels(
        deckVolumeMultipliers.a,
        activeDeckRef.current === 'b' && !isCrossfadingRef.current ? 1 : 0,
      )
    },
    [deckVolumeMultipliers.a, deckVolumeMultipliers.b, isSong, setDeckLevels],
  )

  // Cleanup interval on unmount
  useEffect(() => {
    return () => clearFade()
  }, [clearFade])

  function getTrackReplayGain(track?: typeof song): ReplayGainParams {
    const preAmp = replayGainPreAmp
    const defaultGain = replayGainDefaultGain

    if (!track || !track.replayGain) {
      return { gain: defaultGain, peak: 1, preAmp }
    }

    if (replayGainType === 'album') {
      const { albumGain = defaultGain, albumPeak = 1 } = track.replayGain
      return { gain: albumGain, peak: albumPeak, preAmp }
    }

    const { trackGain = defaultGain, trackPeak = 1 } = track.replayGain
    return { gain: trackGain, peak: trackPeak, preAmp }
  }

  const shouldHandleDeckTransportEvent = useCallback((deck: DeckId) => {
    return (
      activeDeckRef.current === deck && crossfadeStateRef.current === 'idle'
    )
  }, [])

  const audioNodes = (
    <>
      {isSong && deckASong && (
        <MemoAudioPlayer
          key="song-deck-a"
          replayGain={getTrackReplayGain(deckASong)}
          volumeMultiplier={deckVolumeMultipliers.a}
          src={getSongStreamUrl(deckASong.id)}
          autoPlay={isPlaying}
          shouldPlay={isPlaying && (activeDeck === 'a' || incomingDeck === 'a')}
          ignoreErrors={activeDeck !== 'a' && incomingDeck !== 'a'}
          audioRef={songDeckARef}
          onPlay={() => {
            if (shouldHandleDeckTransportEvent('a')) {
              setPlayingState(true)
            }
          }}
          onPause={(e) => {
            const audio = e.currentTarget as HTMLAudioElement & {
              isSkipping?: boolean
            }
            if (audio.isSkipping) {
              audio.isSkipping = false
              return
            }
            if (
              shouldHandleDeckTransportEvent('a') &&
              e.currentTarget.readyState > 0
            ) {
              setPlayingState(false)
            }
          }}
          onLoadedMetadata={() => setupDuration('a')}
          onTimeUpdate={() => setupProgress('a')}
          onEnded={() => {
            if (
              activeDeckRef.current === 'a' &&
              crossfadeStateRef.current === 'idle'
            ) {
              handleSongEnded()
            }
          }}
          onLoadStart={() => setupInitialVolume('a')}
          data-testid="player-song-audio-a"
        />
      )}

      {isSong && deckBSong && (
        <MemoAudioPlayer
          key="song-deck-b"
          replayGain={getTrackReplayGain(deckBSong)}
          volumeMultiplier={deckVolumeMultipliers.b}
          src={getSongStreamUrl(deckBSong.id)}
          autoPlay={isPlaying}
          shouldPlay={isPlaying && (activeDeck === 'b' || incomingDeck === 'b')}
          ignoreErrors={activeDeck !== 'b' && incomingDeck !== 'b'}
          audioRef={songDeckBRef}
          onPlay={() => {
            if (shouldHandleDeckTransportEvent('b')) {
              setPlayingState(true)
            }
          }}
          onPause={(e) => {
            const audio = e.currentTarget as HTMLAudioElement & {
              isSkipping?: boolean
            }
            if (audio.isSkipping) {
              audio.isSkipping = false
              return
            }
            if (
              shouldHandleDeckTransportEvent('b') &&
              e.currentTarget.readyState > 0
            ) {
              setPlayingState(false)
            }
          }}
          onLoadedMetadata={() => setupDuration('b')}
          onTimeUpdate={() => setupProgress('b')}
          onEnded={() => {
            if (
              activeDeckRef.current === 'b' &&
              crossfadeStateRef.current === 'idle'
            ) {
              handleSongEnded()
            }
          }}
          onLoadStart={() => setupInitialVolume('b')}
          data-testid="player-song-audio-b"
        />
      )}

      {isRadio && radio && (
        <MemoAudioPlayer
          volumeMultiplier={1}
          src={radio.streamUrl}
          autoPlay={isPlaying}
          audioRef={radioRef}
          onPlay={() => setPlayingState(true)}
          onPause={(e) => {
            const audio = e.currentTarget as HTMLAudioElement & {
              isSkipping?: boolean
            }
            if (audio.isSkipping) {
              audio.isSkipping = false
              return
            }
            if (e.currentTarget.readyState > 0) {
              setPlayingState(false)
            }
          }}
          onLoadStart={setupInitialVolume}
          data-testid="player-radio-audio"
        />
      )}
    </>
  )

  return (
    <>
      {!hideUi && useRightRailLayout && (
        <PlaybackRail audioRef={getAudioRef()} song={song} radio={radio} />
      )}

      {!hideUi && !useRightRailLayout && (
        <footer className="border-t border-border/55 h-[--player-height] w-full flex items-center fixed bottom-0 left-0 right-0 z-40 bg-background overflow-hidden">
          {backgroundImage && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'left center',
                filter: 'blur(60px)',
                opacity: 0.3,
                transform: 'scale(1.1)',
                maskImage:
                  'linear-gradient(to right, black 0%, black 40%, transparent 100%)',
                WebkitMaskImage:
                  'linear-gradient(to right, black 0%, black 40%, transparent 100%)',
              }}
            />
          )}

          <div className="w-full h-full grid grid-cols-player gap-2 px-4 relative z-10">
            <div className="flex items-center gap-2 w-full">
              {isSong && <MemoTrackInfo song={song} />}
              {isRadio && <MemoRadioInfo radio={radio} />}
            </div>

            <div className="col-span-2 flex flex-col justify-center items-center px-4 gap-1">
              <MemoPlayerControls
                song={song}
                radio={radio}
                audioRef={getAudioRef()}
              />

              {isSong && <MemoPlayerProgress audioRef={getAudioRef()} />}
            </div>

            <div className="flex items-center w-full justify-end">
              <div className="flex items-center gap-1">
                {isSong && (
                  <>
                    <MemoPlayerLikeButton disabled={!song} />
                    <SonaDjButton variant="player" />
                    <MemoLyricsButton disabled={!song} />
                    <MemoPlayerQueueButton disabled={!song} />
                  </>
                )}
                {isRadio && <MemoPlayerClearQueueButton disabled={!radio} />}

                <MemoPlayerVolume disabled={!song && !radio} />
              </div>
            </div>
          </div>
        </footer>
      )}

      {audioNodes}
    </>
  )
}
