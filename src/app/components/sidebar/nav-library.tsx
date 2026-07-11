import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/app/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible'
import {
  MainSidebarGroup,
  MainSidebarGroupLabel,
  MainSidebarMenu,
  MainSidebarMenuItem,
} from '@/app/components/ui/main-sidebar'
import { libraryItems, SidebarItems } from '@/app/layout/sidebar'
import { useAppStore } from '@/store/app.store'
import { safeStorageGet, safeStorageSet } from '@/utils/safe-storage'
import { SidebarMainItem } from './main-item'

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
    item.id === SidebarItems.Genres,
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

  const [libraryOpen, setLibraryOpen] = useState(
    () => safeStorageGet('sidebar_open_library') !== 'false',
  )
  const [exploreOpen, setExploreOpen] = useState(
    () => safeStorageGet('sidebar_open_explore') !== 'false',
  )
  const [foryouOpen, setForyouOpen] = useState(
    () => safeStorageGet('sidebar_open_foryou') !== 'false',
  )

  const toggleLibrary = (open: boolean) => {
    setLibraryOpen(open)
    safeStorageSet('sidebar_open_library', String(open))
  }

  const toggleExplore = (open: boolean) => {
    setExploreOpen(open)
    safeStorageSet('sidebar_open_explore', String(open))
  }

  const toggleForyou = (open: boolean) => {
    setForyouOpen(open)
    safeStorageSet('sidebar_open_foryou', String(open))
  }

  return (
    <>
      <Collapsible open={libraryOpen} onOpenChange={toggleLibrary}>
        <MainSidebarGroup className="px-4 pt-3 pb-0">
          <div className="mb-1.5 px-0 flex items-center justify-between group/header">
            <MainSidebarGroupLabel className="h-6 px-2.5 uppercase tracking-[0.1em] text-foreground/55 flex-1 select-none">
              {t('sidebar.library')}
            </MainSidebarGroupLabel>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 p-0 hover:bg-foreground/10 text-foreground/40 hover:text-foreground opacity-0 group-hover/header:opacity-100 transition-opacity"
              >
                {libraryOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="transition-all duration-300">
            <MainSidebarMenu>
              {primaryLibraryItems.map((item) => (
                <MainSidebarMenuItem key={item.id}>
                  <SidebarMainItem item={item} />
                </MainSidebarMenuItem>
              ))}
            </MainSidebarMenu>
          </CollapsibleContent>
        </MainSidebarGroup>
      </Collapsible>

      <Collapsible open={exploreOpen} onOpenChange={toggleExplore}>
        <MainSidebarGroup className="px-4 pt-4 pb-0">
          <div className="mb-1.5 px-0 flex items-center justify-between group/header">
            <MainSidebarGroupLabel className="h-6 px-2.5 uppercase tracking-[0.1em] text-foreground/55 flex-1 select-none">
              {t('home.explore')}
            </MainSidebarGroupLabel>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 p-0 hover:bg-foreground/10 text-foreground/40 hover:text-foreground opacity-0 group-hover/header:opacity-100 transition-opacity"
              >
                {exploreOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="transition-all duration-300">
            <MainSidebarMenu>
              {launcherItems.map((item) => {
                if (hideRadiosSection && item.id === SidebarItems.Radios)
                  return null

                return (
                  <MainSidebarMenuItem key={item.id}>
                    <SidebarMainItem item={item} />
                  </MainSidebarMenuItem>
                )
              })}
            </MainSidebarMenu>
          </CollapsibleContent>
        </MainSidebarGroup>
      </Collapsible>

      <Collapsible open={foryouOpen} onOpenChange={toggleForyou}>
        <MainSidebarGroup className="px-4 pt-4 pb-0">
          <div className="mb-1.5 px-0 flex items-center justify-between group/header">
            <MainSidebarGroupLabel className="h-6 px-2.5 uppercase tracking-[0.1em] text-foreground/55 flex-1 select-none font-medium">
              {t('home.forYou', 'For you')}
            </MainSidebarGroupLabel>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 p-0 hover:bg-foreground/10 text-foreground/40 hover:text-foreground opacity-0 group-hover/header:opacity-100 transition-opacity"
              >
                {foryouOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="transition-all duration-300">
            <MainSidebarMenu>
              {discoveryItems.map((item) => (
                <MainSidebarMenuItem key={item.id}>
                  <SidebarMainItem item={item} />
                </MainSidebarMenuItem>
              ))}
            </MainSidebarMenu>
          </CollapsibleContent>
        </MainSidebarGroup>
      </Collapsible>
    </>
  )
}
