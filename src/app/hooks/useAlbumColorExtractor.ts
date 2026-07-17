import { useEffect, useRef } from 'react'
import { getSimpleCoverArtUrl } from '@/api/httpClient'
import { usePlayerCurrentSong, useSongColor } from '@/store/player.store'
import { getAlbumColorPalette } from '@/utils/getAlbumColors'
import { getAverageColor } from '@/utils/getAverageColor'

/**
 * Hook that automatically extracts 4 colors from album cover
 * whenever the current song changes.
 */
export function useAlbumColorExtractor() {
  const { coverArt } = usePlayerCurrentSong()
  const { setCurrentSongColorPalette, setCurrentSongColor } = useSongColor()
  const lastCoverArtRef = useRef<string | null>(null)

  useEffect(() => {
    // Skip if same cover art
    if (coverArt === lastCoverArtRef.current || !coverArt) {
      return
    }

    lastCoverArtRef.current = coverArt
    let cancelled = false

    const extractColors = async () => {
      try {
        const coverArtUrl = getSimpleCoverArtUrl(coverArt, 'song', '300')
        const img = new Image()
        img.crossOrigin = 'Anonymous'

        img.onload = async () => {
          if (cancelled) return
          try {
            const palette = await getAlbumColorPalette(img)
            const averageColor = (await getAverageColor(img)).hex
            if (!cancelled) {
              if (palette) setCurrentSongColorPalette(palette)
              if (averageColor) setCurrentSongColor(averageColor)
            }
          } catch (e) {
            console.error('Failed to parse color palette or average color:', e)
            if (!cancelled) {
              setCurrentSongColorPalette(null)
              setCurrentSongColor(null)
            }
          }
        }

        img.onerror = () => {
          if (cancelled) return
          console.error('Failed to load album cover for color extraction')
          setCurrentSongColorPalette(null)
          setCurrentSongColor(null)
        }

        img.src = coverArtUrl
      } catch (error) {
        if (cancelled) return
        console.error('Color extraction error:', error)
        setCurrentSongColorPalette(null)
        setCurrentSongColor(null)
      }
    }

    extractColors()

    return () => {
      cancelled = true
    }
  }, [coverArt, setCurrentSongColorPalette, setCurrentSongColor])
}
