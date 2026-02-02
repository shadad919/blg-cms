/**
 * Reverse geocode lat/lng to a formatted address via OpenCage (geoproxy).
 * Uses in-memory cache to avoid repeated requests for the same coordinates.
 */

const CACHE = new Map<string, string | null>()
const CACHE_KEY_PRECISION = 5

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(CACHE_KEY_PRECISION)},${lng.toFixed(CACHE_KEY_PRECISION)}`
}

export interface ReverseGeocodeResult {
  formatted: string | null
  error?: string
}

const GEOPROXY_KEY =
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GEOPROXY_KEY : undefined

export async function reverseGeocode(
  lat: number,
  lng: number,
  language: string = 'en'
): Promise<ReverseGeocodeResult> {
  const key = cacheKey(lat, lng)
  const cached = CACHE.get(key)
  if (cached !== undefined) return { formatted: cached }

  if (!GEOPROXY_KEY) {
    return { formatted: null }
  }

  try {
    const q = `${lat}+${lng}`
    const url = `https://www.gps-coordinates.net/geoproxy?q=${encodeURIComponent(q)}&key=${GEOPROXY_KEY}&no_annotations=1&language=${language}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status?.code !== 200 || !Array.isArray(data.results) || data.results.length === 0) {
      CACHE.set(key, null)
      return { formatted: null }
    }

    const formatted = data.results[0].formatted ?? null
    CACHE.set(key, formatted)
    return { formatted }
  } catch (err) {
    console.error('Reverse geocode error:', err)
    return { formatted: null, error: String(err) }
  }
}
