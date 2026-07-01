import { lazy, Suspense } from 'react'
import { createHashRouter } from 'react-router-dom'

import {
  AlbumFallback,
  AlbumsFallback,
} from '@/app/components/fallbacks/album-fallbacks'
import { ArtistsFallback } from '@/app/components/fallbacks/artists.tsx'
import { HomeFallback } from '@/app/components/fallbacks/home-fallbacks'
import { PlaylistFallback } from '@/app/components/fallbacks/playlist-fallbacks'
import {
  EpisodeFallback,
  LatestEpisodesFallback,
  PodcastFallback,
} from '@/app/components/fallbacks/podcast-fallbacks'
import {
  InfinitySongListFallback,
  SongListFallback,
} from '@/app/components/fallbacks/song-fallbacks'
// Direct imports (not lazy) to avoid suspense issues
import BaseLayout from '@/app/layout/base'
import DiscoverWeekly from '@/app/pages/discover-weekly'
import ErrorPage from '@/app/pages/error-page'
import ThisIsArtistPage from '@/app/pages/this-is-artist'
import Top50Year from '@/app/pages/top-50-year'
import { albumsLoader } from '@/routes/loaders/albumsLoader'
import { loginLoader } from '@/routes/loginLoader'
import { podcastsLoader, protectedLoader } from '@/routes/protectedLoader'
import { ROUTES } from '@/routes/routesList'

const Album = lazy(() => import('@/app/pages/albums/album'))
const AlbumsList = lazy(() => import('@/app/pages/albums/list'))
const Artist = lazy(() => import('@/app/pages/artists/artist'))
const ArtistsList = lazy(() => import('@/app/pages/artists/list'))
const Favorites = lazy(() => import('@/app/pages/favorites/songlist'))
const Login = lazy(() => import('@/app/pages/login'))
const PlaylistsPage = lazy(() => import('@/app/pages/playlists/list'))
const Playlist = lazy(() => import('@/app/pages/playlists/playlist'))
const Radios = lazy(() => import('@/app/pages/radios/radios-list'))
const SongList = lazy(() => import('@/app/pages/songs/songlist'))
const Home = lazy(() => import('@/app/pages/home'))
const PodcastsList = lazy(() => import('@/app/pages/podcasts/list'))
const Podcast = lazy(() => import('@/app/pages/podcasts/podcast'))
const Episode = lazy(() => import('@/app/pages/podcasts/episode'))
const LatestEpisodes = lazy(
  () => import('@/app/pages/podcasts/latest-episodes'),
)
const GenresList = lazy(() => import('@/app/pages/genres/list'))
const Genre = lazy(() => import('@/app/pages/genres/genre'))

export const router = createHashRouter(
  [
    {
      path: ROUTES.LIBRARY.HOME,
      element: <BaseLayout />,
      loader: protectedLoader,
      children: [
        {
          id: 'home',
          path: ROUTES.LIBRARY.HOME,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<HomeFallback />}>
              <Home />
            </Suspense>
          ),
        },
        {
          id: 'top-50-year',
          path: ROUTES.LIBRARY.TOP_50_YEAR,
          errorElement: <ErrorPage />,
          element: <Top50Year />,
        },
        {
          id: 'discover-daily',
          path: ROUTES.LIBRARY.DISCOVER_WEEKLY,
          errorElement: <ErrorPage />,
          element: <DiscoverWeekly />,
        },
        {
          id: 'this-is-artist',
          path: ROUTES.LIBRARY.THIS_IS_ARTIST,
          errorElement: <ErrorPage />,
          element: <ThisIsArtistPage />,
        },
        {
          id: 'artists',
          path: ROUTES.LIBRARY.ARTISTS,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<ArtistsFallback />}>
              <ArtistsList />
            </Suspense>
          ),
        },
        {
          id: 'songs',
          path: ROUTES.LIBRARY.SONGS,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<InfinitySongListFallback />}>
              <SongList />
            </Suspense>
          ),
        },
        {
          id: 'albums',
          path: ROUTES.LIBRARY.ALBUMS,
          loader: albumsLoader,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<AlbumsFallback />}>
              <AlbumsList />
            </Suspense>
          ),
        },
        {
          id: 'genres',
          path: ROUTES.LIBRARY.GENRES,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<AlbumsFallback />}>
              <GenresList />
            </Suspense>
          ),
        },
        {
          id: 'genre',
          path: ROUTES.GENRE.PATH,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<AlbumsFallback />}>
              <Genre />
            </Suspense>
          ),
        },
        {
          id: 'favorites',
          path: ROUTES.LIBRARY.FAVORITES,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<InfinitySongListFallback />}>
              <Favorites />
            </Suspense>
          ),
        },
        {
          id: 'playlists',
          path: ROUTES.LIBRARY.PLAYLISTS,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<SongListFallback />}>
              <PlaylistsPage />
            </Suspense>
          ),
        },
        {
          id: 'radios',
          path: ROUTES.LIBRARY.RADIOS,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<SongListFallback />}>
              <Radios />
            </Suspense>
          ),
        },
        {
          id: 'artist',
          path: ROUTES.ARTIST.PATH,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<AlbumFallback />}>
              <Artist />
            </Suspense>
          ),
        },
        {
          id: 'album',
          path: ROUTES.ALBUM.PATH,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<AlbumFallback />}>
              <Album />
            </Suspense>
          ),
        },
        {
          id: 'playlist',
          path: ROUTES.PLAYLIST.PATH,
          errorElement: <ErrorPage />,
          element: (
            <Suspense fallback={<PlaylistFallback />}>
              <Playlist />
            </Suspense>
          ),
        },
        {
          id: 'podcasts',
          path: ROUTES.LIBRARY.PODCASTS,
          errorElement: <ErrorPage />,
          loader: podcastsLoader,
          element: (
            <Suspense fallback={<AlbumsFallback />}>
              <PodcastsList />
            </Suspense>
          ),
        },
        {
          id: 'podcast',
          path: ROUTES.PODCASTS.PATH,
          errorElement: <ErrorPage />,
          loader: podcastsLoader,
          element: (
            <Suspense fallback={<PodcastFallback />}>
              <Podcast />
            </Suspense>
          ),
        },
        {
          id: 'episode',
          path: ROUTES.EPISODES.PATH,
          errorElement: <ErrorPage />,
          loader: podcastsLoader,
          element: (
            <Suspense fallback={<EpisodeFallback />}>
              <Episode />
            </Suspense>
          ),
        },
        {
          id: 'latest-episodes',
          path: ROUTES.EPISODES.LATEST,
          errorElement: <ErrorPage />,
          loader: podcastsLoader,
          element: (
            <Suspense fallback={<LatestEpisodesFallback />}>
              <LatestEpisodes />
            </Suspense>
          ),
        },
        {
          id: 'error',
          path: '*',
          element: (
            <Suspense>
              <ErrorPage />
            </Suspense>
          ),
        },
      ],
    },
    {
      id: 'login',
      path: ROUTES.SERVER_CONFIG,
      loader: loginLoader,
      element: (
        <Suspense>
          <Login />
        </Suspense>
      ),
    },
  ],
  {
    future: {
      v7_startTransition: true,
    },
  },
)
