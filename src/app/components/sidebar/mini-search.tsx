import { HomeIcon, SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/app/components/ui/button'
import { useMainSidebar } from '@/app/components/ui/main-sidebar'
import { SimpleTooltip } from '@/app/components/ui/simple-tooltip'
import { useRouteIsActive } from '@/app/hooks/use-route-is-active'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routesList'
import { useAppStore } from '@/store/app.store'

export function MiniSidebarSearch({
  className,
}: React.ComponentProps<typeof Button>) {
  const setOpen = useAppStore((state) => state.command.setOpen)
  const { t } = useTranslation()
  const { open: sidebarOpen } = useMainSidebar()
  const { isActive } = useRouteIsActive()

  if (sidebarOpen) {
    return null
  }

  return (
    <div className="w-full px-4 mt-4">
      <div className="flex flex-col items-center gap-2">
        <SimpleTooltip text={t('sidebar.home')} side="right" delay={50}>
          <Button
            asChild
            variant="ghost"
            className={cn(
              'h-9 w-9 rounded-lg p-0 hover:bg-accent hover:text-accent-foreground',
              isActive(ROUTES.LIBRARY.HOME) &&
                'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              className,
            )}
          >
            <Link
              to={ROUTES.LIBRARY.HOME}
              className={
                isActive(ROUTES.LIBRARY.HOME) ? 'pointer-events-none' : ''
              }
            >
              <HomeIcon className="w-4 h-4" />
            </Link>
          </Button>
        </SimpleTooltip>

        <SimpleTooltip text={t('sidebar.miniSearch')} side="right" delay={50}>
          <Button
            variant="ghost"
            className={cn(
              'h-9 w-9 rounded-lg p-0 hover:bg-accent hover:text-accent-foreground',
              className,
            )}
            onClick={() => setOpen(true)}
          >
            <SearchIcon className="w-4 h-4" />
          </Button>
        </SimpleTooltip>
      </div>
    </div>
  )
}
