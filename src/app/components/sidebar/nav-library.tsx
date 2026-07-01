import { useTranslation } from 'react-i18next'
import {
  MainSidebarGroup,
  MainSidebarGroupLabel,
  MainSidebarMenu,
  MainSidebarMenuItem,
} from '@/app/components/ui/main-sidebar'
import { libraryItems, SidebarItems } from '@/app/layout/sidebar'
import { useAppStore } from '@/store/app.store'
import { SidebarMainItem } from './main-item'
import { SidebarPodcastItem } from './podcast-item'

const primaryLibraryItems = libraryItems.filter(
  (item) =>
    item.id === SidebarItems.Albums ||
    item.id === SidebarItems.Artists ||
    item.id === SidebarItems.Songs,
)

const launcherItems = libraryItems.filter(
  (item) =>
    item.id === SidebarItems.Playlists ||
    item.id === SidebarItems.Radios ||
    item.id === SidebarItems.Genres ||
    item.id === SidebarItems.Podcasts,
)

const discoveryItems = libraryItems.filter(
  (item) =>
    item.id === SidebarItems.DiscoverWeekly ||
    item.id === SidebarItems.Top50Year ||
    item.id === SidebarItems.Favorites,
)

export function NavLibrary() {
  const { t } = useTranslation()
  const hideRadiosSection = useAppStore().pages.hideRadiosSection
  const isPodcastsActive = useAppStore().podcasts.active

  return (
    <>
      <MainSidebarGroup className="px-4 pt-3 pb-0">
        <div className="mb-1.5 px-0">
          <MainSidebarGroupLabel className="h-6 px-2.5 uppercase tracking-[0.1em] text-foreground/55">
            {t('sidebar.library')}
          </MainSidebarGroupLabel>
        </div>
        <MainSidebarMenu>
          {primaryLibraryItems.map((item) => (
            <MainSidebarMenuItem key={item.id}>
              <SidebarMainItem item={item} />
            </MainSidebarMenuItem>
          ))}
        </MainSidebarMenu>
      </MainSidebarGroup>

      <MainSidebarGroup className="px-4 pt-4 pb-0">
        <div className="mb-1.5 px-0">
          <MainSidebarGroupLabel className="h-6 px-2.5 uppercase tracking-[0.1em] text-foreground/55">
            {t('home.explore')}
          </MainSidebarGroupLabel>
        </div>
        <MainSidebarMenu>
          {launcherItems.map((item) => {
            if (hideRadiosSection && item.id === SidebarItems.Radios)
              return null
            if (!isPodcastsActive && item.id === SidebarItems.Podcasts)
              return null

            if (item.id === SidebarItems.Podcasts) {
              return <SidebarPodcastItem key={item.id} item={item} />
            }

            return (
              <MainSidebarMenuItem key={item.id}>
                <SidebarMainItem item={item} />
              </MainSidebarMenuItem>
            )
          })}
        </MainSidebarMenu>
      </MainSidebarGroup>

      <MainSidebarGroup className="px-4 pt-4 pb-0">
        <div className="mb-1.5 px-0">
          <MainSidebarGroupLabel className="h-6 px-2.5 uppercase tracking-[0.1em] text-foreground/55">
            {t('home.forYou', 'For you')}
          </MainSidebarGroupLabel>
        </div>
        <MainSidebarMenu>
          {discoveryItems.map((item) => (
            <MainSidebarMenuItem key={item.id}>
              <SidebarMainItem item={item} />
            </MainSidebarMenuItem>
          ))}
        </MainSidebarMenu>
      </MainSidebarGroup>
    </>
  )
}
