import {
  HeartIcon,
  HomeIcon,
  LibraryIcon,
  ListMusicIcon,
  Mic2Icon,
  Music2Icon,
  PodcastIcon,
  RadioIcon,
  SparklesIcon,
  TagsIcon,
  TrophyIcon,
} from 'lucide-react'
import { ElementType, memo } from 'react'
import { ROUTES } from '@/routes/routesList'

const ListMusic = memo(ListMusicIcon)
const Mic2 = memo(Mic2Icon)
const Music2 = memo(Music2Icon)
const Radio = memo(RadioIcon)
const Home = memo(HomeIcon)
const Library = memo(LibraryIcon)
const _Podcast = memo(PodcastIcon)
const Heart = memo(HeartIcon)
const Sparkles = memo(SparklesIcon)
const Tags = memo(TagsIcon)
const Trophy = memo(TrophyIcon)

export interface ISidebarItem {
  id: string
  title: string
  route: string
  icon: ElementType
}

export enum SidebarItems {
  Home = 'home',
  Artists = 'artists',
  Songs = 'songs',
  Albums = 'albums',
  Genres = 'genres',
  Favorites = 'favorites',
  Playlists = 'playlists',
  Radios = 'radios',
  DiscoverWeekly = 'discover-daily',
  Top50Year = 'top-50-year',
}

export const mainNavItems = [
  {
    id: SidebarItems.Home,
    title: 'sidebar.home',
    route: ROUTES.LIBRARY.HOME,
    icon: Home,
  },
]

export const libraryItems = [
  {
    id: SidebarItems.DiscoverWeekly,
    title: 'sidebar.discoverWeekly',
    route: ROUTES.LIBRARY.DISCOVER_WEEKLY,
    icon: Sparkles,
  },
  {
    id: SidebarItems.Top50Year,
    title: 'sidebar.yourTop50',
    route: ROUTES.LIBRARY.TOP_50_YEAR,
    icon: Trophy,
  },
  {
    id: SidebarItems.Artists,
    title: 'sidebar.artists',
    route: ROUTES.LIBRARY.ARTISTS,
    icon: Mic2,
  },
  {
    id: SidebarItems.Songs,
    title: 'sidebar.songs',
    route: ROUTES.LIBRARY.SONGS,
    icon: Music2,
  },
  {
    id: SidebarItems.Albums,
    title: 'sidebar.albums',
    route: ROUTES.LIBRARY.ALBUMS,
    icon: Library,
  },
  {
    id: SidebarItems.Genres,
    title: 'sidebar.genres',
    route: ROUTES.LIBRARY.GENRES,
    icon: Tags,
  },
  {
    id: SidebarItems.Favorites,
    title: 'sidebar.favorites',
    route: ROUTES.LIBRARY.FAVORITES,
    icon: Heart,
  },
  {
    id: SidebarItems.Playlists,
    title: 'sidebar.playlists',
    route: ROUTES.LIBRARY.PLAYLISTS,
    icon: ListMusic,
  },
  {
    id: SidebarItems.Radios,
    title: 'sidebar.radios',
    route: ROUTES.LIBRARY.RADIOS,
    icon: Radio,
  },
]
