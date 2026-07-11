import clsx from 'clsx'
import {
  Pause,
  Play,
  Repeat,
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
  useCrossfadeSettings,
  usePlayerActions,
  usePlayerCurrentSong,
  usePlayerDuration,
  usePlayerIsPlaying,
  usePlayerLoop,
  usePlayerMediaType,
  usePlayerPrevAndNext,
  usePlayerProgress,
  usePlayerShuffle,
} from '@/store/player.store'
import { LoopState } from '@/types/playerContext'

import { Radio } from '@/types/responses/radios'
import { ISong } from '@/types/responses/song'
import { rememberSongSkip } from '@/utils/listening-memory'
import { manageMediaSession } from '@/utils/setMediaSession'

interface PlayerControlsProps {
  song: ISong
  radio: Radio
  audioRef: RefObject<HTMLAudioElement>
  layout?: 'default' | 'rail'
}

export function PlayerControls({
  song,
  radio,
  audioRef,
  layout = 'default',
}: PlayerControlsProps) {
  const { t } = useTranslation()
  const { isSong } = usePlayerMediaType()
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

  const _handleSeekAction = useCallback(
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

    const startVolume = Math.min(1, audio.volume)
    const fadeMs = 100
    const startTs = performance.now()

    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const progress = Math.min(1, (now - startTs) / fadeMs)
        audio.volume = Math.min(1, Math.max(0, startVolume * (1 - progress)))

        if (progress < 1) {
          requestAnimationFrame(step)
          return
        }
        resolve()
      }

      requestAnimationFrame(step)
    })

    ;(audio as HTMLAudioElement & { isSkipping?: boolean }).isSkipping = true
    audio.pause()
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
    manageMediaSession.setHandlers()
  }, [isPlaying])

  const shuffleTooltip = isShuffleActive
    ? t('player.tooltips.shuffle.disable')
    : t('player.tooltips.shuffle.enable')

  const previousTooltip = t('player.tooltips.previous')
  const nextTooltip = t('player.tooltips.next')

  const _skipRewindTooltip = t('player.tooltips.rewind', { amount: 15 })
  const _skipForwardTooltip = t('player.tooltips.forward', { amount: 30 })

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
  const disableButtons = !song && !radio

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
                  isShuffleActive
                    ? 'text-primary'
                    : 'text-secondary-foreground',
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

          <PlayerButton
            variant="default"
            disabled={!song && !radio}
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

      <PlayerButton
        variant="default"
        disabled={!song && !radio}
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
          'relative rounded-full size-10 p-0 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 transition-transform active:scale-[0.9] hover:scale-[1.08] duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]',
          className,
        )}
        {...props}
      />
    </SimpleTooltip>
  )
}
