import { AlbumListType } from '@/types/responses/album'
import { AlbumsFilters, YearFilter } from '@/utils/albumsFilter'

const LIBRARY = {
  HOME: '/',
  ARTISTS: '/library/artists',
  SONGS: '/library/songs',
  ALBUMS: '/library/albums',
  GENRES: '/library/genres',
  FAVORITES: '/library/favorites',
  PLAYLISTS: '/library/playlists',
  PODCASTS: '/library/podcasts',
  EPISODES: '/library/episodes',
  RADIOS: '/library/radios',
  DISCOVER_WEEKLY: '/library/discover-daily',
  THIS_IS_ARTIST: '/library/this-is-artist',
  TOP_50_YEAR: '/library/top-50-year',
}

const ARTIST = {
  PAGE: (artistId: string) => `${LIBRARY.ARTISTS}/${artistId}`,
  PATH: `${LIBRARY.ARTISTS}/:artistId`,
}

const ALBUM = {
  PAGE: (albumId: string, songId?: string) =>
    `${LIBRARY.ALBUMS}/${encodeURIComponent(albumId)}${songId ? `?songId=${encodeURIComponent(songId)}` : ''}`,
  PATH: `${LIBRARY.ALBUMS}/:albumId`,
}

const ALBUMS = {
  GENRE: (genre: string) =>
    `${LIBRARY.ALBUMS}?filter=${AlbumsFilters.ByGenre}&genre=${encodeURIComponent(genre)}`,
  ARTIST: (id: string, name: string) =>
    `${LIBRARY.ALBUMS}?filter=${AlbumsFilters.ByDiscography}&artistId=${id}&artistName=${encodeURIComponent(name)}`,
  RECENTLY_PLAYED: `${LIBRARY.ALBUMS}?filter=${AlbumsFilters.RecentlyPlayed}`,
  MOST_PLAYED: `${LIBRARY.ALBUMS}?filter=${AlbumsFilters.MostPlayed}`,
  RECENTLY_ADDED: `${LIBRARY.ALBUMS}?filter=${AlbumsFilters.RecentlyAdded}`,
  RANDOM: `${LIBRARY.ALBUMS}?filter=${AlbumsFilters.Random}`,
  SEARCH: (query: string) =>
    `${LIBRARY.ALBUMS}?filter=${AlbumsFilters.Search}&query=${encodeURIComponent(query)}`,
  YEAR: (yearFilter: YearFilter) =>
    `${LIBRARY.ALBUMS}?filter=${AlbumsFilters.ByYear}&yearFilter=${yearFilter}`,
  GENERIC: (filter: AlbumListType) => `${LIBRARY.ALBUMS}?filter=${filter}`,
}

const SONGS = {
  SEARCH: (query: string, songId?: string) =>
    `${LIBRARY.SONGS}?filter=${AlbumsFilters.Search}&query=${encodeURIComponent(query)}${songId ? `&songId=${encodeURIComponent(songId)}` : ''}`,
  ARTIST_TRACKS: (id: string, name: string) =>
    `${LIBRARY.SONGS}?artistId=${id}&artistName=${encodeURIComponent(name)}`,
}

const FAVORITES = {
  PAGE: LIBRARY.FAVORITES,
}

const PLAYLIST = {
  PAGE: (playlistId: string) => `${LIBRARY.PLAYLISTS}/${playlistId}`,
  PATH: `${LIBRARY.PLAYLISTS}/:playlistId`,
}

const PODCASTS = {
  PAGE: (podcastId: string) => `${LIBRARY.PODCASTS}/${podcastId}`,
  PATH: `${LIBRARY.PODCASTS}/:podcastId`,
}

const EPISODES = {
  PAGE: (episodeId: string) => `${LIBRARY.EPISODES}/${episodeId}`,
  PATH: `${LIBRARY.EPISODES}/:episodeId`,
  LATEST: `${LIBRARY.EPISODES}/latest`,
}

const GENRE = {
  PAGE: (genre: string) => `/library/genres/${encodeURIComponent(genre)}`,
  PATH: '/library/genres/:genre',
}

const SERVER_CONFIG = '/server-config'

export const ROUTES = {
  LIBRARY,
  ARTIST,
  ALBUM,
  ALBUMS,
  SONGS,
  FAVORITES,
  PLAYLIST,
  PODCASTS,
  EPISODES,
  GENRE,
  SERVER_CONFIG,
}
