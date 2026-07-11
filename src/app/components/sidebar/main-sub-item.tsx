import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  MainSidebarMenuSubButton,
  MainSidebarMenuSubItem,
} from '@/app/components/ui/main-sidebar'
import { useRouteIsActive } from '@/app/hooks/use-route-is-active'
import { ISidebarItem } from '@/app/layout/sidebar'

export function SidebarMainSubItem({ item }: { item: ISidebarItem }) {
  const { t } = useTranslation()
  const { isActive, isExactActive } = useRouteIsActive()
  const isItemActive = isActive(item.route)
  const isItemExactActive = isExactActive(item.route)

  return (
    <MainSidebarMenuSubItem>
      <MainSidebarMenuSubButton asChild isActive={isItemActive}>
        <Link
          to={item.route}
          className={clsx(isItemExactActive && 'pointer-events-none')}
        >
          {t(item.title)}
        </Link>
      </MainSidebarMenuSubButton>
    </MainSidebarMenuSubItem>
  )
}
