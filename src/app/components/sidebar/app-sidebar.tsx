import { HomeIcon, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import CommandMenu from '@/app/components/command/command-menu'
import { Button } from '@/app/components/ui/button'
import {
  MainSidebar,
  MainSidebarContent,
  MainSidebarFooter,
  MainSidebarHeader,
  MainSidebarRail,
} from '@/app/components/ui/main-sidebar'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { SimpleTooltip } from '@/app/components/ui/simple-tooltip'
import { useRouteIsActive } from '@/app/hooks/use-route-is-active'
import { ROUTES } from '@/routes/routesList'
import { useAppSettings } from '@/store/app.store'
import { MiniSidebarSearch } from './mini-search'
import { MobileCloseButton } from './mobile-close-button'
import { NavLibrary } from './nav-library'
import { NavPlaylists } from './nav-playlists'

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof MainSidebar>) {
  const { t } = useTranslation()
  const { isActive } = useRouteIsActive()
  const { setOpenDialog } = useAppSettings()

  return (
    <MainSidebar collapsible="icon" {...props}>
      <MobileCloseButton />
      <MainSidebarHeader className="border-b border-border/55 pb-3">
        <div className="flex items-center gap-2.5">
          <SimpleTooltip text={t('sidebar.home')} side="right" delay={50}>
            <Button
              asChild
              variant="outline"
              className={`h-10 w-10 p-0 rounded-lg border-border/45 hover:bg-accent hover:text-accent-foreground ${isActive(ROUTES.LIBRARY.HOME) ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}`}
            >
              <Link
                to={ROUTES.LIBRARY.HOME}
                className={
                  isActive(ROUTES.LIBRARY.HOME) ? 'pointer-events-none' : ''
                }
              >
                <HomeIcon className="h-5 w-5" />
              </Link>
            </Button>
          </SimpleTooltip>
          <CommandMenu compact />
        </div>
      </MainSidebarHeader>
      <MiniSidebarSearch />

      <MainSidebarContent className="overflow-hidden">
        <ScrollArea className="h-full">
          <NavLibrary />
          <NavPlaylists />
        </ScrollArea>
      </MainSidebarContent>

      <MainSidebarFooter className="border-t border-border/35 p-3">
        <SimpleTooltip
          text={`${t('settings.label')} (Ctrl+,)`}
          side="right"
          delay={50}
        >
          <Button
            variant="ghost"
            className="h-10 justify-start gap-2.5 rounded-lg px-2.5 text-muted-foreground hover:bg-accent/45 hover:text-foreground"
            onClick={() => setOpenDialog(true)}
          >
            <Settings2 className="h-[18px] w-[18px]" />
            <span className="truncate text-sm group-data-[collapsible=icon]:hidden">
              {t('settings.label')}
            </span>
          </Button>
        </SimpleTooltip>
      </MainSidebarFooter>

      <MainSidebarRail />
    </MainSidebar>
  )
}
