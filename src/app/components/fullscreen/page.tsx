import { clsx } from 'clsx'
import { Minimize2 } from 'lucide-react'
import {
  type ComponentProps,
  memo,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  LyricsPanelView,
  QueuePanelView,
} from '@/app/components/player/panel-views'
import { Button } from '@/app/components/ui/button'
import { Drawer, DrawerContent, DrawerTitle } from '@/app/components/ui/drawer'
import { WindowControlButtons } from '@/app/components/window-control-buttons'
import { useAppWindow } from '@/app/hooks/use-app-window'
import { useAlbumColorExtractor } from '@/app/hooks/useAlbumColorExtractor'
import {
  useLyricsState,
  useMainDrawerState,
  usePlayerStore,
  useQueueState,
} from '@/store/player.store'
import { useFullscreenState } from '@/store/ui.store'
import { isWindows } from '@/utils/desktop'
import { setDesktopTitleBarColors } from '@/utils/theme'
import { FullscreenBackdrop } from './backdrop'
import { FullscreenDragHandler } from './drag-handler'
import { FullscreenLuminanceProvider } from './luminance-context'
import { shouldIgnoreFullscreenOutsideClick } from './panel-controller'
import { FullscreenPlayer } from './player'
import { VisualizerProvider } from './settings'
import { FullscreenTabs } from './tabs'
import { useFullscreenChromeVisibility } from './use-fullscreen-chrome-visibility'

const MemoFullscreenBackdrop = memo(FullscreenBackdrop)
const MemoQueuePanelView = memo(QueuePanelView)
const MemoLyricsPanelView = memo(LyricsPanelView)

function FullscreenScene() {
  const { t } = useTranslation()
  const { setOpen } = useFullscreenState()
  const { queueState } = useQueueState()
  const { lyricsState } = useLyricsState()
  const isPanelOpen = queueState || lyricsState
  const isPanelVisuallyActive = isPanelOpen
  const { isChromeVisible } = useFullscreenChromeVisibility(3000, isPanelOpen)
  const currentSongId = usePlayerStore((state) => state.songlist.currentSong.id)
  const [isSongTransitioning, setIsSongTransitioning] = useState(false)
  const lastSongIdRef = useRef(currentSongId)

  useEffect(() => {
    if (lastSongIdRef.current === currentSongId) return
    lastSongIdRef.current = currentSongId
    setIsSongTransitioning(true)
    const timeoutId = window.setTimeout(
      () => setIsSongTransitioning(false),
      260,
    )
    return () => window.clearTimeout(timeoutId)
  }, [currentSongId])
  useAlbumColorExtractor()

  return (
    <>
      <MemoFullscreenBackdrop />
      <FullscreenDragHandler />
      <FullscreenWindowControls isChromeVisible={isChromeVisible} />

      {/* Top Right Close Button aligned pixel-perfect with enter button in normal mode */}
      <div
        className={clsx(
          'absolute right-6 z-40 transition-all duration-300',
          isChromeVisible
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none -translate-y-2',
        )}
        style={{ top: 'calc(var(--header-height, 48px) + 24px)' }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          className="h-8 w-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
          title={t('player.tooltips.close', 'Close')}
        >
          <Minimize2 className="w-4 h-4" />
        </Button>
      </div>

      <div
        className={clsx(
          'absolute inset-0 z-[18] pointer-events-none transition-opacity duration-260',
          isSongTransitioning ? 'opacity-100' : 'opacity-0',
        )}
        style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
      />
      <div
        className={clsx(
          'absolute inset-0 flex flex-col p-0 2xl:p-8 w-full h-full bg-black/0 z-10 transition-none',
          isChromeVisible ? 'pt-6 2xl:pt-8 gap-4' : 'pt-6 2xl:pt-7 gap-2',
        )}
      >
        <div
          className={clsx(
            'w-full flex-1 min-h-0 px-8 2xl:px-16 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
            isChromeVisible
              ? 'pt-1 2xl:pt-2 translate-y-0'
              : 'pt-1 translate-y-[51px]',
          )}
        >
          <div className="min-h-[300px] h-full max-h-full">
            <FullscreenTabs
              isChromeVisible={isChromeVisible}
              isPanelOpen={isPanelVisuallyActive}
            />
          </div>
        </div>

        <FullscreenIntegratedPanel
          isOpen={isPanelOpen}
          isChromeVisible={isChromeVisible}
        />

        <div
          className={clsx(
            'px-8 2xl:px-16 transition-none',
            isChromeVisible
              ? 'h-[154px] min-h-[154px] py-2'
              : 'h-[102px] min-h-[102px] pt-0 pb-0',
          )}
        >
          <div
            className={clsx(
              'flex h-full',
              isChromeVisible ? 'items-start' : 'items-end',
            )}
          >
            <FullscreenPlayer isChromeVisible={isChromeVisible} />
          </div>
        </div>
      </div>
    </>
  )
}

function FullscreenIntegratedPanel({
  isOpen,
  isChromeVisible,
}: {
  isOpen: boolean
  isChromeVisible: boolean
}) {
  const { queueState } = useQueueState()
  const { lyricsState } = useLyricsState()
  const { setActiveDrawerPanel } = useMainDrawerState()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const activePanel = queueState ? 'queue' : lyricsState ? 'lyrics' : null
  const previousPanelRef = useRef<typeof activePanel>(activePanel)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>(
    'right',
  )

  useEffect(() => {
    if (!activePanel) return
    const previousPanel = previousPanelRef.current
    if (previousPanel && previousPanel !== activePanel) {
      setSlideDirection(activePanel === 'queue' ? 'left' : 'right')
    }
    previousPanelRef.current = activePanel
  }, [activePanel])

  const closePanel = useCallback(() => {
    setActiveDrawerPanel(null)
  }, [setActiveDrawerPanel])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      closePanel()
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      if (panelRef.current?.contains(target)) return
      if (shouldIgnoreFullscreenOutsideClick(target)) return
      closePanel()
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [closePanel, isOpen])

  return (
    <div
      ref={panelRef}
      className={clsx(
        'absolute left-8 right-8 2xl:left-16 2xl:right-16 top-0 z-30 transform-gpu transition-opacity duration-260',
        isChromeVisible
          ? 'bottom-[170px] 2xl:bottom-[188px]'
          : 'bottom-[110px]',
        isOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none',
      )}
    >
      <div className="relative w-full h-full overflow-hidden">
        <div
          key={activePanel ?? 'closed'}
          className={clsx(
            'flex w-full h-full gap-6 px-0 pt-11 pb-4 2xl:pt-12',
            activePanel &&
              (slideDirection === 'left'
                ? 'fullscreen-panel-slide-left'
                : 'fullscreen-panel-slide-right'),
          )}
        >
          {activePanel === 'queue' && (
            <MemoQueuePanelView inFullscreenOverlay />
          )}
          {activePanel === 'lyrics' && (
            <div className="w-full h-full">
              <MemoLyricsPanelView inFullscreenOverlay />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FullscreenWindowControls({
  isChromeVisible,
}: {
  isChromeVisible: boolean
}) {
  if (!isWindows) return null

  const blockNativeOverlayHit = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      className={clsx(
        'absolute top-0 right-0 z-40 transition-opacity duration-200',
        isChromeVisible
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none',
      )}
    >
      <div
        className="absolute top-0 right-0 h-12 w-[170px] pointer-events-auto"
        onPointerDown={blockNativeOverlayHit}
      />
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
        <WindowControlButtons />
      </div>
    </div>
  )
}
export function FullscreenGlobal() {
  const { handleFullscreen } = useAppWindow()
  const { open, setOpen } = useFullscreenState()
  const { setActiveDrawerPanel } = useMainDrawerState()

  useEffect(() => {
    setDesktopTitleBarColors(open)
    if (!open) setActiveDrawerPanel(null)
  }, [open, setActiveDrawerPanel])

  return (
    <FullscreenDrawer
      open={open}
      onOpenChange={setOpen}
      onAnimationEnd={handleFullscreen}
    />
  )
}

type FullscreenDrawerProps = ComponentProps<typeof Drawer>

function FullscreenDrawer(props: FullscreenDrawerProps) {
  const isOpen = Boolean(props.open)

  return (
    <VisualizerProvider>
      <Drawer
        fixed={true}
        handleOnly={true}
        disablePreventScroll={true}
        dismissible={true}
        modal={false}
        {...props}
      >
        <DrawerTitle className="sr-only">Big Player</DrawerTitle>
        <DrawerContent
          className="fullscreen-drawer-content h-screen w-screen rounded-t-none border-none select-none cursor-default mt-0"
          showHandle={false}
          aria-describedby={undefined}
        >
          {isOpen ? (
            <FullscreenLuminanceProvider>
              <FullscreenScene />
            </FullscreenLuminanceProvider>
          ) : null}
        </DrawerContent>
      </Drawer>
    </VisualizerProvider>
  )
}
