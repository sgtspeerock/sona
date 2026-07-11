import { clsx } from 'clsx'
import {
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { Fragment } from 'react/jsx-runtime'
import RepeatOne from '@/app/components/icons/repeat-one'
import { Button } from '@/app/components/ui/button'
import {
  usePlayerActions,
  usePlayerCurrentSong,
  usePlayerDuration,
  usePlayerIsPlaying,
  usePlayerLoop,
  usePlayerPrevAndNext,
  usePlayerProgress,
  usePlayerShuffle,
} from '@/store/player.store'
import { LoopState } from '@/types/playerContext'
import { rememberSongSkip } from '@/utils/listening-memory'

export function FullscreenControls() {
  const isPlaying = usePlayerIsPlaying()
  const isShuffleActive = usePlayerShuffle()
  const loopState = usePlayerLoop()
  const currentSong = usePlayerCurrentSong()
  const progress = usePlayerProgress()
  const duration = usePlayerDuration()
  const { hasPrev, hasNext } = usePlayerPrevAndNext()
  const {
    isPlayingOneSong,
    toggleShuffle,
    playNextSong,
    playPrevSong,
    togglePlayPause,
    toggleLoop,
  } = usePlayerActions()

  return (
    <Fragment>
      <Button
        size="icon"
        variant="ghost"
        data-state={isShuffleActive && 'active'}
        className={clsx(
          buttonsStyle.utility,
          'fullscreen-control-button',
          isShuffleActive && buttonsStyle.activeDot,
        )}
        style={{ ...buttonsStyle.style }}
        onClick={() => toggleShuffle()}
        disabled={isPlayingOneSong() || !hasNext}
      >
        <Shuffle className={buttonsStyle.secondaryIcon} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className={clsx(buttonsStyle.secondary, 'fullscreen-control-button')}
        style={{ ...buttonsStyle.style }}
        onClick={() => playPrevSong()}
        disabled={!hasPrev}
      >
        <SkipBack className={buttonsStyle.secondaryIconFilled} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className={clsx(buttonsStyle.main, 'fullscreen-control-button')}
        style={{ ...buttonsStyle.style }}
        onClick={() => togglePlayPause()}
      >
        {isPlaying ? (
          <Pause className={buttonsStyle.mainIcon} strokeWidth={1} />
        ) : (
          <Play className={buttonsStyle.mainIcon} />
        )}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className={clsx(buttonsStyle.secondary, 'fullscreen-control-button')}
        style={{ ...buttonsStyle.style }}
        onClick={() => {
          rememberSongSkip(currentSong, progress, duration)
          playNextSong()
        }}
        disabled={!hasNext && loopState !== LoopState.All}
      >
        <SkipForward className={buttonsStyle.secondaryIconFilled} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        data-state={loopState !== LoopState.Off && 'active'}
        className={clsx(
          buttonsStyle.utility,
          'fullscreen-control-button',
          loopState !== LoopState.Off && buttonsStyle.activeDot,
        )}
        onClick={() => toggleLoop()}
        style={{ ...buttonsStyle.style }}
      >
        {loopState === LoopState.Off && (
          <Repeat
            className={clsx(
              buttonsStyle.secondaryIcon,
              'text-[color:var(--fs-btn-fg-muted)]',
            )}
          />
        )}
        {loopState === LoopState.All && (
          <Repeat
            className={clsx(
              buttonsStyle.secondaryIcon,
              'text-[color:var(--fs-btn-fg)]',
            )}
          />
        )}
        {loopState === LoopState.One && (
          <RepeatOne
            className={clsx(
              buttonsStyle.secondaryIcon,
              'text-[color:var(--fs-btn-fg)]',
            )}
          />
        )}
      </Button>
    </Fragment>
  )
}

export const buttonsStyle = {
  main: 'w-14 h-14 rounded-full border border-[color:var(--fs-btn-main-border)] bg-[color:var(--fs-btn-main-bg)] text-[color:var(--fs-btn-fg)] hover:bg-[color:var(--fs-btn-main-bg-hover)] hover:scale-[1.08] active:scale-[0.9] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]',
  mainIcon: 'w-7 h-7 text-current fill-current',
  secondary:
    'relative w-12 h-12 rounded-full border border-[color:var(--fs-btn-secondary-border)] bg-[color:var(--fs-btn-secondary-bg)] text-[color:var(--fs-btn-fg-muted)] hover:text-[color:var(--fs-btn-fg)] data-[state=active]:text-[color:var(--fs-btn-fg)] data-[state=active]:bg-[color:var(--fs-btn-secondary-bg-active)] hover:bg-[color:var(--fs-btn-secondary-bg-hover)] hover:border-[color:var(--fs-btn-secondary-border-hover)] hover:scale-[1.08] active:scale-[0.9] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]',
  utility:
    'relative w-12 h-12 rounded-full border border-[color:var(--fs-btn-utility-border)] bg-[color:var(--fs-btn-utility-bg)] text-[color:var(--fs-btn-fg-muted)] hover:text-[color:var(--fs-btn-fg)] data-[state=active]:text-[color:var(--fs-btn-fg)] hover:bg-[color:var(--fs-btn-utility-bg-hover)] hover:border-[color:var(--fs-btn-utility-border-hover)] hover:scale-[1.08] active:scale-[0.9] transition-all duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]',
  secondaryIcon: 'w-6 h-6',
  secondaryIconFilled: 'w-6 h-6 text-current fill-current',
  activeDot: 'player-button-active',
  style: {
    backfaceVisibility: 'hidden' as const,
  },
}
