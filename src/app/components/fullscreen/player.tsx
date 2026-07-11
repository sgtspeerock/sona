import { clsx } from 'clsx'
import { ListMusic, MicVocal } from 'lucide-react'
import { CSSProperties } from 'react'
import { Button } from '@/app/components/ui/button'
import {
  useLyricsState,
  useMainDrawerState,
  useQueueState,
} from '@/store/player.store'

import { FullscreenControls } from './controls'
import { LikeButton } from './like-button'
import { useFullscreenLuminance } from './luminance-context'
import { getNextFullscreenPanel } from './panel-controller'
import { FullscreenProgress } from './progress'
import { FullscreenSettings } from './settings'
import { SonaDjButton } from './sona-dj'
import { VolumeContainer } from './volume-container'

interface FullscreenPlayerProps {
  isChromeVisible: boolean
}

type PanelTarget = 'queue' | 'lyrics'

export function FullscreenPlayer({ isChromeVisible }: FullscreenPlayerProps) {
  const { queueState } = useQueueState()
  const { lyricsState } = useLyricsState()
  const { setActiveDrawerPanel } = useMainDrawerState()
  const { useDarkForeground: useDarkControls } = useFullscreenLuminance()

  const controlToneStyle = (
    useDarkControls
      ? {
          '--fs-btn-fg': 'rgba(0,0,0,0.9)',
          '--fs-btn-fg-muted': 'rgba(0,0,0,0.72)',
          '--fs-btn-main-bg': 'rgba(255,255,255,0.56)',
          '--fs-btn-main-bg-hover': 'rgba(255,255,255,0.68)',
          '--fs-btn-main-border': 'rgba(0,0,0,0.26)',
          '--fs-btn-secondary-bg': 'rgba(255,255,255,0.34)',
          '--fs-btn-secondary-bg-active': 'rgba(255,255,255,0.46)',
          '--fs-btn-secondary-bg-hover': 'rgba(255,255,255,0.42)',
          '--fs-btn-secondary-border': 'rgba(0,0,0,0.2)',
          '--fs-btn-secondary-border-hover': 'rgba(0,0,0,0.28)',
          '--fs-btn-utility-bg': 'rgba(255,255,255,0)',
          '--fs-btn-utility-bg-hover': 'rgba(255,255,255,0.26)',
          '--fs-btn-utility-border': 'rgba(0,0,0,0)',
          '--fs-btn-utility-border-hover': 'rgba(0,0,0,0.24)',
        }
      : {
          '--fs-btn-fg': 'hsl(var(--foreground) / 0.94)',
          '--fs-btn-fg-muted': 'hsl(var(--foreground) / 0.78)',
          '--fs-btn-main-bg': 'hsl(var(--primary) / 0.34)',
          '--fs-btn-main-bg-hover': 'hsl(var(--primary) / 0.44)',
          '--fs-btn-main-border': 'hsl(var(--primary) / 0.38)',
          '--fs-btn-secondary-bg': 'hsl(var(--primary) / 0.2)',
          '--fs-btn-secondary-bg-active': 'hsl(var(--primary) / 0.28)',
          '--fs-btn-secondary-bg-hover': 'hsl(var(--primary) / 0.24)',
          '--fs-btn-secondary-border': 'hsl(var(--primary) / 0.22)',
          '--fs-btn-secondary-border-hover': 'hsl(var(--primary) / 0.42)',
          '--fs-btn-utility-bg': 'transparent',
          '--fs-btn-utility-bg-hover': 'hsl(var(--primary) / 0.1)',
          '--fs-btn-utility-border': 'transparent',
          '--fs-btn-utility-border-hover': 'hsl(var(--primary) / 0.3)',
        }
  ) as CSSProperties

  const switchPanel = (target: PanelTarget) => {
    const nextPanel = getNextFullscreenPanel(target, {
      queueOpen: queueState,
      lyricsOpen: lyricsState,
    })
    if (nextPanel === null) {
      setActiveDrawerPanel(null)
      return
    }

    setActiveDrawerPanel(nextPanel)
  }

  const toggleQueueInFullscreen = () => {
    switchPanel('queue')
  }

  const toggleLyricsInFullscreen = () => {
    switchPanel('lyrics')
  }

  return (
    <div className="relative w-full h-full flex flex-col justify-end pb-[68px]">
      <div
        className={clsx(
          'transition-opacity duration-300',
          isChromeVisible ? 'mb-2.5 opacity-100' : 'mb-2.5 opacity-0',
        )}
      >
        <FullscreenProgress active={isChromeVisible} />
      </div>

      <div
        className={clsx(
          'absolute left-0 right-0 bottom-0 flex items-center justify-between gap-4 px-4 py-1 transition-opacity duration-300',
          isChromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        data-fullscreen-control-surface
        style={controlToneStyle}
      >
        <div className="w-[360px] flex items-center gap-2 justify-start">
          <FullscreenSettings />
        </div>

        <div className="flex flex-1 justify-center items-center gap-2">
          <FullscreenControls />
        </div>

        <div className="w-[360px] flex items-center justify-end">
          <div className="flex items-center gap-1" data-fullscreen-action-group>
            <div className="-ml-1">
              <LikeButton />
            </div>
            <SonaDjButton />
            <Button
              variant="ghost"
              size="icon"
              className={clsx(
                'rounded-md size-10 p-2 relative border border-[color:var(--fs-btn-utility-border)] bg-[color:var(--fs-btn-utility-bg)] text-[color:var(--fs-btn-fg-muted)] hover:text-[color:var(--fs-btn-fg)] hover:bg-[color:var(--fs-btn-utility-bg-hover)] hover:border-[color:var(--fs-btn-utility-border-hover)] focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors',
                lyricsState &&
                  'player-button-active text-[color:var(--fs-btn-fg)]',
              )}
              data-fullscreen-panel-toggle="lyrics"
              onClick={toggleLyricsInFullscreen}
            >
              <MicVocal
                className={clsx(
                  'w-4 h-4',
                  lyricsState && 'text-[color:var(--fs-btn-fg)]',
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={clsx(
                'rounded-md size-10 p-2 relative border border-[color:var(--fs-btn-utility-border)] bg-[color:var(--fs-btn-utility-bg)] text-[color:var(--fs-btn-fg-muted)] hover:text-[color:var(--fs-btn-fg)] hover:bg-[color:var(--fs-btn-utility-bg-hover)] hover:border-[color:var(--fs-btn-utility-border-hover)] focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors',
                queueState &&
                  'player-button-active text-[color:var(--fs-btn-fg)]',
              )}
              data-fullscreen-panel-toggle="queue"
              onClick={toggleQueueInFullscreen}
            >
              <ListMusic
                className={clsx(
                  'w-4 h-4',
                  queueState && 'text-[color:var(--fs-btn-fg)]',
                )}
              />
            </Button>
            <VolumeContainer />
          </div>
        </div>
      </div>
    </div>
  )
}
