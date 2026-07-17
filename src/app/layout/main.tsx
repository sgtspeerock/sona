import { useEffect } from 'react'
import { Location, Outlet, useLocation } from 'react-router-dom'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { useAppStore } from '@/store/app.store'
import { scrollPageToTop } from '@/utils/scrollPageToTop'

export function MainRoutes() {
  const { pathname } = useLocation() as Location
  const commandOpen = useAppStore((state) => state.command.open)

  useEffect(() => {
    if (pathname) scrollPageToTop()
  }, [pathname])

  return (
    <main className="sona-atmosphere relative flex h-full">
      <ScrollArea
        id="main-scroll-area"
        className="w-full bg-transparent mr-[410px] min-[1700px]:mr-[440px]"
      >
        <Outlet />
      </ScrollArea>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 ${
          commandOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </main>
  )
}
