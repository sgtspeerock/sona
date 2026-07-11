import type { ISong } from '@/types/responses/song'
import { subsonic } from './subsonic'

/**
 * Rabbit Hole Service
 *
 * Generates a discovery queue of ~50 similar songs based on Last.fm recommendations.
 * Uses Last.fm API to find similar artists, then searches for those artists in your
 * Subsonic library to build a queue of songs you'll probably love.
 */

interface LastFmArtistResponse {
  similarartists: {
    artist: Array<{
      name: string
      match: string
    }>
  }
}

interface LastFmTrackResponse {
  similartracks: {
    track: Array<{
      name: string
      artist: {
        name: string
      }
    }>
  }
}

class RabbitHoleService {
  constructor(private apiKey: string) {}

  async generateForArtist(
    artistName: string,
    artistId?: string,
  ): Promise<ISong[]> {
    try {
      // Get similar artists from Last.fm
      const similarArtists = await this.getSimilarArtists(artistName)

      // Search for songs from similar artists in Subsonic
      const allSongs: ISong[] = []

      for (const artist of similarArtists.slice(0, 15)) {
        try {
          const searchResult = await subsonic.search.get({
            query: artist.name,
            artistCount: 1,
            albumCount: 0,
            songCount: 10,
          })

          if (searchResult?.song && searchResult.song.length > 0) {
            allSongs.push(...searchResult.song)
          }
        } catch (error) {
          console.warn(`Could not fetch songs for ${artist.name}:`, error)
        }
      }

      // If we have the artist ID, add some of their top songs too
      if (artistId && allSongs.length < 30) {
        try {
          const artistData = await subsonic.artists.getOne(artistId)
          if (artistData?.album && artistData.album.length > 0) {
            // Get a few songs from their albums
            for (const _album of artistData.album.slice(0, 3)) {
              const searchResult = await subsonic.search.get({
                query: artistName,
                artistCount: 0,
                albumCount: 0,
                songCount: 5,
              })

              if (searchResult?.song) {
                allSongs.push(...searchResult.song)
              }
            }
          }
        } catch (error) {
          console.warn('Could not fetch additional artist songs:', error)
        }
      }

      // Shuffle and return up to 50 songs
      return this.shuffleAndLimit(allSongs, 50)
    } catch (error) {
      console.error('Rabbit Hole generation failed:', error)
      return []
    }
  }

  async generateForAlbum(
    artistName: string,
    albumName: string,
    albumId: string,
  ): Promise<ISong[]> {
    // For albums, just use the artist-based approach
    return this.generateForArtist(artistName)
  }

  async generateForSong(
    artistName: string,
    trackName: string,
  ): Promise<ISong[]> {
    try {
      // Get similar tracks from Last.fm
      const similarTracks = await this.getSimilarTracks(artistName, trackName)

      // Search for those tracks in Subsonic
      const allSongs: ISong[] = []

      for (const track of similarTracks.slice(0, 50)) {
        try {
          const searchQuery = `${track.artist.name} ${track.name}`
          const searchResult = await subsonic.search.get({
            query: searchQuery,
            artistCount: 0,
            albumCount: 0,
            songCount: 3,
          })

          if (searchResult?.song && searchResult.song.length > 0) {
            allSongs.push(searchResult.song[0])
          }
        } catch (error) {
          console.warn(`Could not fetch track ${track.name}:`, error)
        }
      }

      return this.shuffleAndLimit(allSongs, 50)
    } catch (error) {
      console.error('Rabbit Hole generation failed:', error)
      return []
    }
  }

  private async getSimilarArtists(
    artistName: string,
  ): Promise<Array<{ name: string; match: string }>> {
    const cleanArtist = artistName.includes('+')
      ? artistName.replace(/\+/g, '%2B')
      : artistName
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(cleanArtist)}&api_key=${this.apiKey}&format=json&limit=15`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.statusText}`)
    }

    const data = (await response.json()) as LastFmArtistResponse
    return data.similarartists?.artist || []
  }

  private async getSimilarTracks(
    artistName: string,
    trackName: string,
  ): Promise<Array<{ name: string; artist: { name: string } }>> {
    const cleanArtist = artistName.includes('+')
      ? artistName.replace(/\+/g, '%2B')
      : artistName
    const cleanTrack = trackName.includes('+')
      ? trackName.replace(/\+/g, '%2B')
      : trackName
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(cleanArtist)}&track=${encodeURIComponent(cleanTrack)}&api_key=${this.apiKey}&format=json&limit=50`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.statusText}`)
    }

    const data = (await response.json()) as LastFmTrackResponse
    return data.similartracks?.track || []
  }

  private shuffleAndLimit(songs: ISong[], limit: number): ISong[] {
    // Remove duplicates by ID
    const uniqueSongs = Array.from(
      new Map(songs.map((song) => [song.id, song])).values(),
    )

    // Fisher-Yates shuffle
    const shuffled = [...uniqueSongs]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled.slice(0, limit)
  }
}

export function getRabbitHoleService(apiKey: string): RabbitHoleService {
  return new RabbitHoleService(apiKey)
}
