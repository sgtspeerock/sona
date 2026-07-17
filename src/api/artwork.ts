import { getCoverArtUrl, getSimpleCoverArtUrl } from '@/api/httpClient'
import { CoverArt } from '@/types/coverArtType'

type ResolveArtworkOptions = {
  id?: string
  type: CoverArt
  size?: string | number
}

const resolvedArtworkCache = new Map<string, string>()
const inFlightArtworkRequests = new Map<string, Promise<string>>()
const MAX_RESOLVED_ARTWORK_CACHE = 1500

function getArtworkKey(id: string, type: CoverArt, size: string) {
  return `${type}:${size}:${id}`
}

function isEphemeralBlobUrl(value: string) {
  return value.startsWith('blob:')
}

function setResolvedArtworkCache(key: string, value: string) {
  // Blob URLs are revoked by the image cache LRU layer, so keeping them in this
  // higher-level cache can return dead URLs after navigation-heavy sessions.
  // Only persist stable URLs here.
  if (isEphemeralBlobUrl(value)) return
  resolvedArtworkCache.set(key, value)
  if (resolvedArtworkCache.size <= MAX_RESOLVED_ARTWORK_CACHE) return

  const oldestKey = resolvedArtworkCache.keys().next().value as
    | string
    | undefined
  if (!oldestKey) return
  resolvedArtworkCache.delete(oldestKey)
}

export async function resolveArtwork({
  id,
  type,
  size = 300,
}: ResolveArtworkOptions) {
  const normalizedSize = size.toString()
  const fallbackUrl = getSimpleCoverArtUrl(undefined, type, normalizedSize)

  if (!id) return fallbackUrl
  if (
    /^(https?:)?\/\//i.test(id) ||
    id.startsWith('data:') ||
    id.startsWith('blob:')
  ) {
    return id
  }

  const key = getArtworkKey(id, type, normalizedSize)
  const cached = resolvedArtworkCache.get(key)
  if (cached) {
    if (isEphemeralBlobUrl(cached)) {
      resolvedArtworkCache.delete(key)
    } else {
      return cached
    }
  }

  const inFlight = inFlightArtworkRequests.get(key)
  if (inFlight) return inFlight

  const request = (async () => {
    try {
      const url = await getCoverArtUrl(id, type, normalizedSize)
      const resolved = url || fallbackUrl
      setResolvedArtworkCache(key, resolved)
      return resolved
    } catch {
      return fallbackUrl
    } finally {
      inFlightArtworkRequests.delete(key)
    }
  })()

  inFlightArtworkRequests.set(key, request)
  return request
}

export function invalidateArtworkCache(id: string) {
  for (const key of resolvedArtworkCache.keys()) {
    if (key.endsWith(`:${id}`)) {
      resolvedArtworkCache.delete(key)
    }
  }
}
