import type { Song } from '@/types/responses/song'
import { logger } from '@/utils/logger'
import type { LastFmArtist, LastFmSimilarArtist } from './lastfm'
import { lastfm } from './lastfm'
import { search } from './search'
import { songs } from './songs'

interface DiscoverWeeklyConfig {
  username?: string
  apiKey?: string
  aiEnabled?: boolean
  aiApiKey?: string
  targetArtists?: number
  songsPerArtist?: number
  genreBoost?: number
}

interface ArtistWithMatch extends LastFmSimilarArtist {
  score: number
}

interface GenerationResult {
  playlist: Song[]
  metadata: {
    generatedAt: string
    artistsUsed: string[]
    totalSongs: number
  }
}

/**
 * Fuzzy match artist names (handles slight differences)
 */
function fuzzyMatch(name1: string, name2: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim()

  return normalize(name1) === normalize(name2)
}

/**
 * Check if artist exists in Subsonic library
 */
async function findArtistInLibrary(artistName: string): Promise<string | null> {
  try {
    const results = await search.get({
      query: artistName,
      artistCount: 5,
      albumCount: 0,
      songCount: 0,
    })

    const matchedArtist = results?.artist?.find((a) =>
      fuzzyMatch(a.name, artistName),
    )

    return matchedArtist?.id || null
  } catch (error) {
    console.error(`[DiscoverWeekly] Failed to search for ${artistName}:`, error)
    return null
  }
}

/**
 * Get random songs from an artist using Subsonic's getTopSongs
 * CHANGED: Only returns 1 song per artist
 */
async function getArtistSongs(
  artistName: string,
  count: number,
): Promise<Song[]> {
  try {
    // Get top songs for this artist
    const topSongs = await songs.getTopSongs(artistName)

    if (!topSongs || topSongs.length === 0) {
      logger.info(`[DiscoverWeekly] No songs found for ${artistName}`)
      return []
    }

    // CHANGED: Always return only 1 song per artist
    const shuffled = topSongs.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 1)

    logger.info(
      `[DiscoverWeekly] Got ${selected.length} song from ${artistName}`,
    )

    return selected
  } catch (error) {
    console.error(
      `[DiscoverWeekly] Failed to get songs for ${artistName}:`,
      error,
    )
    return []
  }
}

/**
 * Main Discover Weekly generation function
 * CHANGED: Target 50 total artists (more similar, fewer listened)
 */
export async function generateDiscoverWeekly(
  config: DiscoverWeeklyConfig,
): Promise<GenerationResult> {
  const {
    username,
    apiKey,
    aiEnabled,
    aiApiKey,
    targetArtists = 50, // CHANGED: Increased from 15 to 50
    songsPerArtist = 1, // CHANGED: 1 song per artist
  } = config

  if (aiEnabled && aiApiKey) {
    logger.info('[DiscoverDaily] AI mode enabled. Generating via OpenRouter...')
    try {
      const favs = await songs.getFavoriteSongs()
      const favSongs = favs?.song ?? []

      const rand = await songs.getRandomSongs({ size: 100 })
      const randSongs = rand ?? []

      const allCand = [...favSongs, ...randSongs]
      if (allCand.length < 30) {
        const fallbackSongs = await songs.getAllSongs(100)
        allCand.push(...fallbackSongs)
      }

      const deduped = Array.from(new Map(allCand.map((s) => [s.id, s])).values())
      const llmCandidates = deduped.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        genre: s.genre || 'Unknown',
        year: s.year || 'Unknown',
      })).slice(0, 150)

      logger.info(`[DiscoverDaily] Sending ${llmCandidates.length} candidate songs to OpenRouter...`)

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiApiKey}`,
          'HTTP-Referer': 'https://github.com/sgtspeerock/sona',
          'X-Title': 'Sona',
        },
        body: JSON.stringify({
          model: 'tencent/hy3:free',
          messages: [
            {
              role: 'system',
              content: 'You are Sona AI, a professional music curator. Your task is to analyze the user\'s song candidate pool and return a curated playlist of exactly 30 song IDs in a JSON array format: ["id1", "id2", ...]. Select songs that are cohesive, thematic, and flow well. Return ONLY the JSON array. Do not include markdown code block syntax, explanation text, or other characters.',
            },
            {
              role: 'user',
              content: JSON.stringify(llmCandidates),
            },
          ],
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenRouter API responded with status ${response.status}`)
      }

      const data = await response.json()
      const text = data.choices[0].message.content.trim()
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      const cleanedJson = jsonMatch ? jsonMatch[0] : text
      const recommendedIds = JSON.parse(cleanedJson) as string[]

      const recommendedSongs = recommendedIds
        .map((id) => deduped.find((s) => s.id === id))
        .filter((s): s is Song => !!s)

      if (recommendedSongs.length > 0) {
        logger.info(`[DiscoverDaily] AI successfully generated ${recommendedSongs.length} songs.`)
        return {
          playlist: recommendedSongs,
          metadata: {
            generatedAt: new Date().toISOString(),
            artistsUsed: Array.from(new Set(recommendedSongs.map((s) => s.artist))),
            totalSongs: recommendedSongs.length,
          },
        }
      }
    } catch (e) {
      logger.error('[DiscoverDaily] AI generation failed, falling back to conventional Last.fm method:', e)
    }
  }

  logger.info('[DiscoverWeekly] Starting conventional generation...')

  // Step 1: Get top artists from Last.fm
  const [overallTopArtists, recentTopArtists] = await Promise.all([
    lastfm.getTopArtists(username, apiKey, 'overall', 30),
    lastfm.getTopArtists(username, apiKey, '1month', 30),
  ])

  logger.info(
    `[DiscoverWeekly] Got ${overallTopArtists.length} overall + ${recentTopArtists.length} recent artists`,
  )

  // Merge and deduplicate
  const topArtistsMap = new Map<string, LastFmArtist>()
  ;[...overallTopArtists, ...recentTopArtists].forEach((artist) => {
    topArtistsMap.set(artist.name.toLowerCase(), artist)
  })
  const topArtists = Array.from(topArtistsMap.values())

  // Step 2: Get similar artists for each top artist
  // CHANGED: Increased similar artist search depth
  const similarArtistsMap = new Map<string, ArtistWithMatch>()

  // CHANGED: Use more top artists to get more similar recommendations
  for (const topArtist of topArtists.slice(0, 20)) {
    try {
      const similar = await lastfm.getSimilarArtists(topArtist.name, apiKey, 30)

      similar.forEach((simArtist) => {
        const key = simArtist.name.toLowerCase()
        // Skip if already in top artists
        if (topArtistsMap.has(key)) return

        const existingScore = similarArtistsMap.get(key)?.score || 0
        const newScore = existingScore + parseFloat(simArtist.match)

        similarArtistsMap.set(key, {
          ...simArtist,
          score: newScore,
        })
      })
    } catch (error) {
      console.error(
        `[DiscoverWeekly] Failed to get similar for ${topArtist.name}:`,
        error,
      )
    }
  }

  logger.info(
    `[DiscoverWeekly] Found ${similarArtistsMap.size} similar artists`,
  )

  // Step 3: Sort by score and find in library
  const sortedSimilar = Array.from(similarArtistsMap.values()).sort(
    (a, b) => b.score - a.score,
  )

  const foundArtists: Array<{ name: string; id: string }> = []

  for (const simArtist of sortedSimilar) {
    if (foundArtists.length >= targetArtists) break

    const artistId = await findArtistInLibrary(simArtist.name)
    if (artistId) {
      foundArtists.push({
        name: simArtist.name,
        id: artistId,
      })
      logger.info(
        `[DiscoverWeekly] Found ${simArtist.name} (score: ${simArtist.score.toFixed(2)})`,
      )
    }
  }

  logger.info(
    `[DiscoverWeekly] Found ${foundArtists.length}/${targetArtists} artists in library`,
  )

  // Step 4: Get songs from found artists (1 per artist)
  const allSongs: Song[] = []

  for (const artist of foundArtists) {
    const artistSongs = await getArtistSongs(artist.name, songsPerArtist)
    allSongs.push(...artistSongs)
  }

  // Step 5: Shuffle final playlist
  const shuffledPlaylist = allSongs.sort(() => Math.random() - 0.5)

  logger.info(
    `[DiscoverWeekly] Generated playlist with ${shuffledPlaylist.length} songs`,
  )

  return {
    playlist: shuffledPlaylist,
    metadata: {
      generatedAt: new Date().toISOString(),
      artistsUsed: foundArtists.map((a) => a.name),
      totalSongs: shuffledPlaylist.length,
    },
  }
}

export async function shouldRegeneratePlaylist(
  lastGenerated: string | null,
): Promise<boolean> {
  if (!lastGenerated) return true

  const lastDate = new Date(lastGenerated)
  const now = new Date()

  // Check if it's Monday and more than 7 days have passed
  const daysSince = Math.floor(
    (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  return daysSince >= 7 && now.getDay() === 1 // Monday
}
