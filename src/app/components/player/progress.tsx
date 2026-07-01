import clsx from 'clsx'
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ProgressSlider } from '@/app/components/ui/slider'
import { podcasts } from '@/service/podcasts'
import { subsonic } from '@/service/subsonic'
import {
  usePlayerActions,
  usePlayerDuration,
  usePlayerIsPlaying,
  usePlayerMediaType,
  usePlayerProgress,
  usePlayerSonglist,
} from '@/store/player.store'
import { useScrobbleStatusStore } from '@/store/scrobble.store'
import { useFullscreenState } from '@/store/ui.store'
import { convertSecondsToTime } from '@/utils/convertSecondsToTime'
import { logger } from '@/utils/logger'

interface PlayerProgressProps {
  audioRef: RefObject<HTMLAudioElement>
  layout?: 'default' | 'rail'
}

export function PlayerProgress({
  audioRef,
  layout = 'default',
}: PlayerProgressProps) {
  const progress = usePlayerProgress()
  const [localProgress, setLocalProgress] = useState(progress)
  const [visualProgress, setVisualProgress] = useState(progress)
  const currentDuration = usePlayerDuration()
  const isPlaying = usePlayerIsPlaying()
  const { currentSong, currentList, podcastList, currentSongIndex } =
    usePlayerSonglist()
  const isFullscreenOpen = useFullscreenState((state) => state.open)
  const { isSong, isPodcast } = usePlayerMediaType()
  const { setProgress, setUpdatePodcastProgress, getCurrentPodcastProgress } =
    usePlayerActions()
  const isScrobbleSentRef = useRef(false)
  const isNowPlayingSentRef = useRef(false)
  const isNowPlayingSendingRef = useRef(false)
  const isSeekingRef = useRef(false)
  const scrobbleStatus = useScrobbleStatusStore((state) => state.status)
  const scrobbleTrackId = useScrobbleStatusStore((state) => state.trackId)
  const setScrobbleStatus = useScrobbleStatusStore((state) => state.setStatus)

  const isEmpty = isSong && currentList.length === 0

  const updateAudioCurrentTime = useCallback(
    (value: number) => {
      isSeekingRef.current = false
      if (audioRef.current) {
        audioRef.current.currentTime = value
      }
    },
    [audioRef],
  )

  const handleSeeking = useCallback((amount: number) => {
    isSeekingRef.current = true
    setLocalProgress(amount)
    setVisualProgress(amount)
  }, [])

  // Fallback for cases where pointer-up/commit is not fired by the slider.
  useEffect(() => {
    if (!isSeekingRef.current) return

    const timeoutId = setTimeout(() => {
      isSeekingRef.current = false
    }, 1800)

    return () => clearTimeout(timeoutId)
  }, [localProgress])

  const handleSeeked = useCallback(
    (amount: number) => {
      updateAudioCurrentTime(amount)
      setProgress(amount)
      setLocalProgress(amount)
      setVisualProgress(amount)
    },
    [setProgress, updateAudioCurrentTime],
  )

  const handleSeekedFallback = useCallback(() => {
    if (localProgress !== progress) {
      updateAudioCurrentTime(localProgress)
      setProgress(localProgress)
    }
    setVisualProgress(localProgress)
  }, [localProgress, progress, setProgress, updateAudioCurrentTime])

  useEffect(() => {
    if (isFullscreenOpen) {
      setVisualProgress(progress)
      return
    }
    if (isSeekingRef.current) return
    if (!isPlaying) {
      setVisualProgress(progress)
      return
    }

    let frameId: number
    const tick = () => {
      const next = audioRef.current?.currentTime ?? progress
      setVisualProgress((prev) => (Math.abs(prev - next) > 0.015 ? next : prev))
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [audioRef, isFullscreenOpen, isPlaying, progress])

  const [showRemaining, setShowRemaining] = useState(false)

  const songDuration = useMemo(
    () => convertSecondsToTime(currentDuration ?? 0),
    [currentDuration],
  )

  const activeProgress = isSeekingRef.current ? localProgress : visualProgress
  const remainingTime = `-${convertSecondsToTime((currentDuration ?? 0) - activeProgress)}`

  const sendScrobble = useCallback(async (songId: string) => {
    await subsonic.scrobble.send(songId)
  }, [])

  const sendNowPlaying = useCallback(async (songId: string) => {
    await subsonic.scrobble.sendNowPlaying(songId)
  }, [])

  const listenedSecondsRef = useRef(0)
  const lastProgressRef = useRef(0)
  const isScrobbleSendingRef = useRef(false)
  const lastScrobbleAttemptAtRef = useRef(0)
  const lastSavedPodcastProgressRef = useRef(0)
  const SCROBBLE_RETRY_COOLDOWN_MS = 10000

  const shouldSendFullScrobble = useCallback(
    (listenedSeconds: number, durationSeconds: number) => {
      if (!Number.isFinite(listenedSeconds) || listenedSeconds <= 0) return false
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return false

      const thresholdSeconds = 150
      return (
        listenedSeconds >= durationSeconds / 2 ||
        listenedSeconds >= thresholdSeconds
      )
    },
    [],
  )

  useEffect(() => {
    isScrobbleSentRef.current = false
    isNowPlayingSentRef.current = false
    isNowPlayingSendingRef.current = false
    isScrobbleSendingRef.current = false
    listenedSecondsRef.current = 0
    lastProgressRef.current = 0
    lastScrobbleAttemptAtRef.current = 0
  }, [currentSong.id])

  useEffect(() => {
    if (!isSong || !isPlaying || !currentSong.id) return
    if (isNowPlayingSentRef.current || isNowPlayingSendingRef.current) return
    if (
      scrobbleTrackId === currentSong.id &&
      (scrobbleStatus === 'sending-now' || scrobbleStatus === 'now-ok')
    ) {
      return
    }

    isNowPlayingSendingRef.current = true
    setScrobbleStatus('sending-now', currentSong.id)

    void sendNowPlaying(currentSong.id)
      .then(() => {
        isNowPlayingSendingRef.current = false
        isNowPlayingSentRef.current = true
        setScrobbleStatus('now-ok', currentSong.id)
      })
      .catch((error) => {
        isNowPlayingSendingRef.current = false
        setScrobbleStatus('now-failed', currentSong.id)
        logger.warn('Now playing request failed', error)
      })
  }, [
    currentSong.id,
    isPlaying,
    isSong,
    scrobbleStatus,
    scrobbleTrackId,
    sendNowPlaying,
    setScrobbleStatus,
  ])

  useEffect(() => {
    if (isSeekingRef.current || !isPlaying) {
      return
    }
    if (isSong) {
      const deltaProgress = progress - lastProgressRef.current
      if (deltaProgress > 0 && deltaProgress <= 15) {
        listenedSecondsRef.current += deltaProgress
      }
      lastProgressRef.current = progress

      if (
        !isScrobbleSentRef.current &&
        !isScrobbleSendingRef.current &&
        Date.now() - lastScrobbleAttemptAtRef.current >=
          SCROBBLE_RETRY_COOLDOWN_MS &&
        shouldSendFullScrobble(listenedSecondsRef.current, currentDuration)
      ) {
        isScrobbleSendingRef.current = true
        lastScrobbleAttemptAtRef.current = Date.now()
        setScrobbleStatus('sending', currentSong.id)
        void sendScrobble(currentSong.id)
          .then(() => {
            isScrobbleSentRef.current = true
            isScrobbleSendingRef.current = false
            setScrobbleStatus('ok', currentSong.id)
          })
          .catch((error) => {
            isScrobbleSendingRef.current = false
            setScrobbleStatus('failed', currentSong.id)
            logger.warn('Scrobble request failed', error)
          })
      }
    }
  }, [
    progress,
    currentDuration,
    isSong,
    sendScrobble,
    currentSong.id,
    isPlaying,
    setScrobbleStatus,
    shouldSendFullScrobble,
  ])

  useEffect(() => {
    if (!isPodcast) {
      lastSavedPodcastProgressRef.current = 0
      return
    }

    const podcast = podcastList[currentSongIndex] ?? null
    if (!podcast) {
      lastSavedPodcastProgressRef.current = 0
      return
    }

    const existingProgress = getCurrentPodcastProgress()
    lastSavedPodcastProgressRef.current = Math.max(
      0,
      Math.floor(existingProgress || 0),
    )
  }, [currentSongIndex, getCurrentPodcastProgress, isPodcast, podcastList])

  // Used to save listening progress to backend every 30 seconds
  useEffect(() => {
    if (!isPodcast || !podcastList) return
    if (progress === 0) return

    const podcast = podcastList[currentSongIndex] ?? null
    if (!podcast) return

    const currentProgress = Math.floor(progress)
    if (currentProgress - lastSavedPodcastProgressRef.current < 30) return

    const podcastProgress = getCurrentPodcastProgress()
    if (progress === podcastProgress) return

    lastSavedPodcastProgressRef.current = currentProgress
    setUpdatePodcastProgress(progress)

    podcasts
      .saveEpisodeProgress(podcast.id, progress)
      .then(() => {
        logger.info('Progress sent:', progress)
      })
      .catch((error) => {
        // Allow retry on the next interval-sized progress increase.
        lastSavedPodcastProgressRef.current = Math.max(
          0,
          currentProgress - 30,
        )
        logger.error('Error sending progress', error)
      })
  }, [
    currentSongIndex,
    getCurrentPodcastProgress,
    isPodcast,
    podcastList,
    progress,
    setUpdatePodcastProgress,
  ])

  const currentTime = convertSecondsToTime(activeProgress)

  const isProgressLarge = useMemo(() => {
    return localProgress >= 3600 || progress >= 3600
  }, [localProgress, progress])

  const isDurationLarge = useMemo(() => {
    return currentDuration >= 3600
  }, [currentDuration])

  return (
    <div
      className={clsx(
        'flex w-full justify-center items-center gap-2',
        isEmpty && 'opacity-50',
      )}
    >
      <small
        className={clsx(
          'text-xs text-muted-foreground text-right',
          isProgressLarge ? 'min-w-14' : 'min-w-10',
        )}
        data-testid="player-current-time"
      >
        {currentTime}
      </small>
      {!isEmpty || isPodcast ? (
        <ProgressSlider
          defaultValue={[0]}
          value={[activeProgress]}
          tooltipTransformer={convertSecondsToTime}
          max={currentDuration}
          step={1}
          className={clsx(
            'cursor-pointer w-full min-w-[8rem] player-progress-slider',
            layout === 'rail' ? 'max-w-none' : 'max-w-[32rem]',
          )}
          onValueChange={([value]) => handleSeeking(value)}
          onValueCommit={([value]) => handleSeeked(value)}
          // Sometimes onValueCommit doesn't work properly
          // so we also have to set the value on pointer/mouse up events
          // see https://github.com/radix-ui/primitives/issues/1760
          onPointerUp={handleSeekedFallback}
          onMouseUp={handleSeekedFallback}
          data-testid="player-progress-slider"
        />
      ) : (
        <ProgressSlider
          defaultValue={[0]}
          max={100}
          step={1}
          disabled={true}
          className={clsx(
            'cursor-pointer w-full min-w-[8rem] pointer-events-none player-progress-slider',
            layout === 'rail' ? 'max-w-none' : 'max-w-[32rem]',
          )}
        />
      )}
      <small
        className={clsx(
          'text-xs text-muted-foreground text-left cursor-pointer select-none',
          isDurationLarge ? 'min-w-14' : 'min-w-10',
        )}
        data-testid="player-duration-time"
        onClick={() => setShowRemaining((v) => !v)}
      >
        {showRemaining ? remainingTime : songDuration}
      </small>
    </div>
  )
}
