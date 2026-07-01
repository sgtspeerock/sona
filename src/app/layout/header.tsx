import { NavigationButtons } from '@/app/components/header/navigation-buttons'
import { SessionModeDropdown } from '@/app/components/header/session-mode-dropdown'
import { UserDropdown } from '@/app/components/header/user-dropdown'
import { HeaderSongInfo } from '@/app/components/header-song'
import { MiniPlayerModeButton } from '@/app/components/mini-player/mode-button'
import { MainSidebarTrigger } from '@/app/components/ui/main-sidebar'
import { WindowControlButtons } from '@/app/components/window-control-buttons'
import { useAppWindow } from '@/app/hooks/use-app-window'
import { isLinux, isMacOS, isWindows } from '@/utils/desktop'

export function Header() {
  const { isFullscreen } = useAppWindow()

  return (
    <header className="w-full grid grid-cols-header h-header px-4 fixed top-0 right-0 left-0 z-20 bg-background border-b electron-drag">
      <div className="flex items-center gap-1">
        {isMacOS && !isFullscreen && <div className="w-[70px]" />}
        <NavigationButtons />
        <MainSidebarTrigger className="ml-1" />
        <MiniPlayerModeButton />
      </div>
      <HeaderSongInfo />
      <div className="flex justify-end items-center gap-2">
        <SessionModeDropdown />
        <UserDropdown />
        {isWindows && !isFullscreen && (
          <WindowControlButtons
            className="ml-1"
            buttonClassName="h-7 w-7 rounded-[8px] border-transparent bg-transparent text-foreground/90 hover:bg-accent/65"
            closeButtonClassName="hover:bg-red-600/75 hover:border-red-500/40 hover:text-white"
          />
        )}
        {isLinux && !isFullscreen && <div className="w-[94px]" />}
      </div>
    </header>
  )
}
