import clsx from 'clsx'
import {
  Pause,
  Play,
  Repeat,
  RotateCcwIcon,
  RotateCwIcon,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import {
  ComponentPropsWithoutRef,
  RefObject,
  useCallback,
  useEffect,
} from 'react'
import { useTranslation } from 'react-i18next'
import RepeatOne from '@/app/components/icons/repeat-one'
import { Button } from '@/app/components/ui/button'
import { SimpleTooltip } from '@/app/components/ui/simple-tooltip'
import { usePlayerHotkeys } from '@/app/hooks/use-audio-hotkeys'
import { cn } from '@/lib/utils'
import {
  usePlayerActions,
  usePlayerCurrentSong,
  useCrossfadeSettings,
  usePlayerDuration,
  usePlayerIsPlaying,
  usePlayerLoop,
  usePlayerMediaType,
  usePlayerPrevAndNext,
  usePlayerProgress,
  usePlayerShuffle,
} from '@/store/player.store'
import { LoopState } from '@/types/playerContext'
import { EpisodeWithPodcast } from '@/types/responses/podcasts'
import { Radio } from '@/types/responses/radios'
import { ISong } from '@/types/responses/song'
import { rememberSongSkip } from '@/utils/listening-memory'
import { manageMediaSession } from '@/utils/setMediaSession'

interface PlayerControlsProps {
  song: ISong
  radio: Radio
  podcast: EpisodeWithPodcast
  audioRef: RefObject<HTMLAudioElement>
  layout?: 'default' | 'rail'
}

export function PlayerControls({
  song,
  radio,
  podcast,
  audioRef,
  layout = 'default',
}: PlayerControlsProps) {
  const { t } = useTranslation()
  const { isSong, isPodcast } = usePlayerMediaType()
  const isShuffleActive = usePlayerShuffle()
  const { hasPrev, hasNext } = usePlayerPrevAndNext()
  const loopState = usePlayerLoop()
  const isPlaying = usePlayerIsPlaying()
  const currentSong = usePlayerCurrentSong()
  const progress = usePlayerProgress()
  const duration = usePlayerDuration()
  const { enabled: crossfadeEnabled } = useCrossfadeSettings()
  const {
    isPlayingOneSong,
    toggleShuffle,
    toggleLoop,
    togglePlayPause,
    playPrevSong,
    playNextSong,
  } = usePlayerActions()
  const { useAudioHotkeys } = usePlayerHotkeys()

  useAudioHotkeys('space', togglePlayPause)
  useAudioHotkeys('mod+left', playPrevSong)
  useAudioHotkeys('mod+right', () => {
    if (isSong) rememberSongSkip(currentSong, progress, duration)
    playNextSong()
  })
  useAudioHotkeys('mod+s', toggleShuffle)
  useAudioHotkeys('mod+r', toggleLoop)

  const handleSeekAction = useCallback(
    (value: number) => {
      const audio = audioRef.current
      if (!audio) return

      audio.currentTime += value
    },
    [audioRef],
  )

  const handleNextWithSoftCut = useCallback(async () => {
    if (isSong) rememberSongSkip(currentSong, progress, duration)

    if (crossfadeEnabled) {
      playNextSong()
      return
    }

    if (!isSong || !isPlaying) {
      playNextSong()
      return
    }

    const audio = audioRef.current
    if (!audio) {
      playNextSong()
      return
    }

    const startVolume = audio.volume
    const fadeMs = 100
    const startTs = performance.now()

    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const progress = Math.min(1, (now - startTs) / fadeMs)
        audio.volume = Math.max(0, startVolume * (1 - progress))

        if (progress < 1) {
          requestAnimationFrame(step)
          return
        }
        resolve()
      }

      requestAnimationFrame(step)
    })

    audio.volume = startVolume
    playNextSong()
  }, [
    audioRef,
    crossfadeEnabled,
    currentSong,
    duration,
    isPlaying,
    isSong,
    playNextSong,
    progress,
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: isPlaying needed to trigger
  useEffect(() => {
    if (isPodcast) {
      manageMediaSession.setPodcastHandlers({ handleSeekAction })
    } else {
      manageMediaSession.setHandlers()
    }
  }, [handleSeekAction, isPodcast, isPlaying])

  const shuffleTooltip = isShuffleActive
    ? t('player.tooltips.shuffle.disable')
    : t('player.tooltips.shuffle.enable')

  const previousTooltip = t('player.tooltips.previous')
  const nextTooltip = t('player.tooltips.next')

  const skipRewindTooltip = t('player.tooltips.rewind', { amount: 15 })
  const skipForwardTooltip = t('player.tooltips.forward', { amount: 30 })

  const playTooltip = isPlaying
    ? t('player.tooltips.pause')
    : t('player.tooltips.play')

  const repeatTooltips = {
    0: t('player.tooltips.repeat.enable'),
    1: t('player.tooltips.repeat.enableOne'),
    2: t('player.tooltips.repeat.disable'),
  }
  const repeatTooltip = repeatTooltips[loopState]

  const cannotGotoNextSong = !hasNext && loopState !== LoopState.All
  const disableButtons = !song && !radio && !podcast

  if (layout === 'rail') {
    return (
      <div className="mb-1 grid w-full grid-cols-[72px,minmax(0,1fr),72px] items-center gap-2">
        <div className="flex justify-start">
          {isSong && (
            <PlayerButton
              className="night-player-side-button"
              disabled={!song || isPlayingOneSong()}
              onClick={toggleShuffle}
              data-testid="player-button-shuffle"
              tooltip={shuffleTooltip}
            >
              <Shuffle
                className={clsx(
                  'night-player-side-icon',
                  isShuffleActive ? 'text-primary' : 'text-secondary-foreground',
                )}
              />
            </PlayerButton>
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          <PlayerButton
            className="night-player-side-button"
            disabled={disableButtons || !hasPrev}
            onClick={playPrevSong}
            data-testid="player-button-prev"
            tooltip={previousTooltip}
          >
            <SkipBack className="night-player-side-icon text-secondary-foreground fill-secondary-foreground" />
          </PlayerButton>

          {isPodcast && (
            <PlayerButton
              className="night-player-side-button"
              onClick={() => handleSeekAction(-15)}
              data-testid="player-button-skip-backward"
              tooltip={skipRewindTooltip}
            >
              <span className="text-secondary-foreground font-light text-[8px] absolute">
                15
              </span>
              <RotateCcwIcon className="night-player-side-icon text-secondary-foreground" />
            </PlayerButton>
          )}

          <PlayerButton
            variant="default"
            disabled={!song && !radio && !isPodcast}
            onClick={togglePlayPause}
            data-testid={`player-button-${isPlaying ? 'pause' : 'play'}`}
            tooltip={playTooltip}
            className="play-button-accent-glow size-12 [&_svg]:size-[20px]"
          >
            {isPlaying ? (
              <Pause className="fill-primary-foreground" />
            ) : (
              <Play className="fill-primary-foreground" />
            )}
          </PlayerButton>

          {isPodcast && (
            <PlayerButton
              className="night-player-side-button"
              onClick={() => handleSeekAction(30)}
              data-testid="player-button-skip-forward"
              tooltip={skipForwardTooltip}
            >
              <span className="text-secondary-foreground font-light text-[8px] absolute">
                30
              </span>
              <RotateCwIcon className="night-player-side-icon text-secondary-foreground" />
            </PlayerButton>
          )}

          <PlayerButton
            className="night-player-side-button"
            disabled={disableButtons || cannotGotoNextSong}
            onClick={handleNextWithSoftCut}
            data-testid="player-button-next"
            tooltip={nextTooltip}
          >
            <SkipForward className="night-player-side-icon text-secondary-foreground fill-secondary-foreground" />
          </PlayerButton>
        </div>

        <div className="flex justify-end">
          {isSong && (
            <PlayerButton
              className="night-player-side-button"
              disabled={!song}
              onClick={toggleLoop}
              data-testid="player-button-loop"
              tooltip={repeatTooltip}
            >
              {loopState === LoopState.Off && (
                <Repeat className="night-player-side-icon text-secondary-foreground" />
              )}
              {loopState === LoopState.All && (
                <Repeat className="night-player-side-icon text-primary" />
              )}
              {loopState === LoopState.One && (
                <RepeatOne className="night-player-side-icon text-primary" />
              )}
            </PlayerButton>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full gap-1 justify-center items-center mb-1">
      {isSong && (
        <PlayerButton
          className={clsx(
            'night-player-side-button',
            isShuffleActive && 'player-button-active',
          )}
          disabled={!song || isPlayingOneSong()}
          onClick={toggleShuffle}
          data-testid="player-button-shuffle"
          tooltip={shuffleTooltip}
        >
          <Shuffle
            className={clsx(
              'night-player-side-icon',
              isShuffleActive ? 'text-primary' : 'text-secondary-foreground',
            )}
          />
        </PlayerButton>
      )}

      <PlayerButton
        className="night-player-side-button"
        disabled={disableButtons || !hasPrev}
        onClick={playPrevSong}
        data-testid="player-button-prev"
        tooltip={previousTooltip}
      >
        <SkipBack className="night-player-side-icon text-secondary-foreground fill-secondary-foreground" />
      </PlayerButton>

      {isPodcast && (
        <PlayerButton
          className="night-player-side-button"
          onClick={() => handleSeekAction(-15)}
          data-testid="player-button-skip-backward"
          tooltip={skipRewindTooltip}
        >
          <span className="text-secondary-foreground font-light text-[8px] absolute">
            15
          </span>
          <RotateCcwIcon className="night-player-side-icon text-secondary-foreground" />
        </PlayerButton>
      )}

      <PlayerButton
        variant="default"
        disabled={!song && !radio && !isPodcast}
        onClick={togglePlayPause}
        data-testid={`player-button-${isPlaying ? 'pause' : 'play'}`}
        tooltip={playTooltip}
        className="play-button-accent-glow"
      >
        {isPlaying ? (
          <Pause className="fill-primary-foreground" />
        ) : (
          <Play className="fill-primary-foreground" />
        )}
      </PlayerButton>

      {isPodcast && (
        <PlayerButton
          className="night-player-side-button"
          onClick={() => handleSeekAction(30)}
          data-testid="player-button-skip-forward"
          tooltip={skipForwardTooltip}
        >
          <span className="text-secondary-foreground font-light text-[8px] absolute">
            30
          </span>
          <RotateCwIcon className="night-player-side-icon text-secondary-foreground" />
        </PlayerButton>
      )}

      <PlayerButton
        className="night-player-side-button"
        disabled={disableButtons || cannotGotoNextSong}
        onClick={handleNextWithSoftCut}
        data-testid="player-button-next"
        tooltip={nextTooltip}
      >
        <SkipForward className="night-player-side-icon text-secondary-foreground fill-secondary-foreground" />
      </PlayerButton>

      {isSong && (
        <PlayerButton
          className={clsx(
            'night-player-side-button',
            loopState !== LoopState.Off && 'player-button-active',
          )}
          disabled={!song}
          onClick={toggleLoop}
          data-testid="player-button-loop"
          tooltip={repeatTooltip}
        >
          {loopState === LoopState.Off && (
            <Repeat className="night-player-side-icon text-secondary-foreground" />
          )}
          {loopState === LoopState.All && (
            <Repeat className="night-player-side-icon text-primary" />
          )}
          {loopState === LoopState.One && (
            <RepeatOne className="night-player-side-icon text-primary" />
          )}
        </PlayerButton>
      )}
    </div>
  )
}

type PlayerButtonProps = ComponentPropsWithoutRef<typeof Button> & {
  tooltip: string
}

function PlayerButton({ className, tooltip, ...props }: PlayerButtonProps) {
  return (
    <SimpleTooltip text={tooltip}>
      <Button
        variant="ghost"
        className={cn(
          'relative rounded-full size-10 p-0 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0',
          className,
        )}
        {...props}
      />
    </SimpleTooltip>
  )
}
