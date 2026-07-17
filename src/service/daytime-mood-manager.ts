import type { Song } from '@/types/responses/song'
import { logger } from '@/utils/logger'
import { songs } from './songs'

let cachedSongs: Song[] = []
let cachedPeriod: string | null = null

export function getDaytimePeriod(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 24) return 'evening'
  return 'night'
}

export function clearDaytimeMoodCache() {
  cachedSongs = []
  cachedPeriod = null
}

const DEFAULT_GENRES_MAP: Record<string, string[]> = {
  morning: ['pop', 'indie', 'folk', 'acoustic', 'rock', 'alternative'],
  afternoon: ['electronic', 'dance', 'hip-hop', 'rap', 'metal', 'funk'],
  evening: ['jazz', 'soul', 'lofi', 'synthwave', 'chill', 'blues', 'r&b'],
  night: ['ambient', 'chillout', 'classical', 'sleep', 'relax', 'instrumental'],
}

export async function fetchDaytimeMoodSongs(
  aiEnabled: boolean,
  aiApiKey: string,
): Promise<Song[]> {
  const period = getDaytimePeriod()

  // Use cache if same period is active
  if (cachedPeriod === period && cachedSongs.length > 0) {
    return cachedSongs
  }

  // console.info(`[DaytimeMood] Fetching songs for period: ${period} (AI: ${aiEnabled})`)

  let candidateSongs: Song[] = []
  try {
    let favSongs: Song[] = []
    try {
      const favs = await songs.getFavoriteSongs()
      // console.info(`[DaytimeMood] Collected ${favSongs.length} favorites.`)
    } catch (e) {
      console.warn('[DaytimeMood] Failed to fetch favorites:', e)
    }

    let randSongs: Song[] = []
    try {
      const rand = await songs.getRandomSongs({ size: 120 })
      randSongs = rand ?? []
      // console.info(`[DaytimeMood] Collected ${randSongs.length} random songs.`)
    } catch (e) {
      console.warn('[DaytimeMood] Failed to fetch random songs:', e)
    }

    candidateSongs = [...favSongs, ...randSongs]

    if (candidateSongs.length < 50) {
      try {
        const all = await songs.getAllSongs(100)
        candidateSongs.push(...all)
        // console.info(`[DaytimeMood] Collected ${all.length} songs from getAllSongs (total candidate size: ${candidateSongs.length}).`)
      } catch (e) {
        console.warn('[DaytimeMood] Failed to fetch all songs:', e)
      }
    }

    // Deduplicate
    candidateSongs = Array.from(new Map(candidateSongs.map((s) => [s.id, s])).values())
  } catch (error) {
    console.error('[DaytimeMood] Error collecting candidates:', error)
  }

  if (aiEnabled && aiApiKey && candidateSongs.length > 0) {
    try {
      const llmCandidates = candidateSongs.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        genre: s.genre || 'Unknown',
        year: s.year || 'Unknown',
      })).slice(0, 150)

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
              content: `You are Sona AI, a professional music curator. Your task is to select up to 35 songs from the user's candidate pool that perfectly match a '${period}' mood. Return ONLY a JSON array of the recommended song IDs (e.g. ["id1", "id2"]). Do not include explanation text or markdown styling.`,
            },
            {
              role: 'user',
              content: JSON.stringify(llmCandidates),
            },
          ],
          temperature: 0.75,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.choices[0].message.content.trim()
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        const cleanedJson = jsonMatch ? jsonMatch[0] : text
        const recommendedIds = JSON.parse(cleanedJson) as string[]

        const recommendedSongs = recommendedIds
          .map((id) => candidateSongs.find((s) => s.id === id))
          .filter((s): s is Song => !!s)

        if (recommendedSongs.length > 0) {
          // console.info(`[DaytimeMood] AI successfully curated ${recommendedSongs.length} tracks.`)
          cachedSongs = recommendedSongs
          cachedPeriod = period
          return cachedSongs
        }
      } else {
        const errorText = await response.text().catch(() => '')
        console.error(`[DaytimeMood] OpenRouter API returned error ${response.status} (${response.statusText}): ${errorText}`)
      }
    } catch (e) {
      console.error('[DaytimeMood] AI recommendation failed, falling back to genre filters:', e)
    }
  }

  // Fallback: Filter candidates by target genres
  const targetGenres = DEFAULT_GENRES_MAP[period] || []
  const filtered = candidateSongs.filter((song) => {
    const songGenre = (song.genre || '').toLowerCase()
    return targetGenres.some((tg) => songGenre.includes(tg))
  })

  // Shuffle and use
  const shuffled = (filtered.length > 5 ? filtered : candidateSongs).sort(() => Math.random() - 0.5)
  cachedSongs = shuffled.slice(0, 30)
  cachedPeriod = period
  return cachedSongs
}
