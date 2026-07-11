import { useEffect, useState } from 'react'
import { getSimpleCoverArtUrl } from '@/api/httpClient'

function getImageLuminanceFromElement(image: HTMLImageElement) {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null

    const size = 24
    canvas.width = size
    canvas.height = size
    context.drawImage(image, 0, 0, size, size)
    const data = context.getImageData(0, 0, size, size).data

    let sum = 0
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255
      if (alpha < 0.1) continue
      const red = data[i] / 255
      const green = data[i + 1] / 255
      const blue = data[i + 2] / 255
      sum += (0.2126 * red + 0.7152 * green + 0.0722 * blue) * alpha
      count += alpha
    }

    if (count === 0) return null
    return sum / count
  } catch {
    return null
  }
}

export function useCoverLuminance(
  coverArt?: string,
  size: '150' | '300' = '300',
) {
  const [luminance, setLuminance] = useState<number | null>(null)

  useEffect(() => {
    if (!coverArt) {
      setLuminance(null)
      return
    }

    let cancelled = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = getSimpleCoverArtUrl(coverArt, 'song', size)

    image.onload = () => {
      if (cancelled) return
      setLuminance(getImageLuminanceFromElement(image))
    }

    image.onerror = () => {
      if (cancelled) return
      setLuminance(null)
    }

    return () => {
      cancelled = true
    }
  }, [coverArt, size])

  return luminance
}
