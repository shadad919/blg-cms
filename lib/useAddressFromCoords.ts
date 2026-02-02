'use client'

import { useEffect, useState } from 'react'
import { reverseGeocode } from './geocode'

export function useAddressFromCoords(
  lat: number | undefined,
  lng: number | undefined,
  language: string = 'en'
): { address: string | null; loading: boolean } {
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setAddress(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    reverseGeocode(lat, lng, language).then(({ formatted }) => {
      if (!cancelled) {
        setAddress(formatted ?? null)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [lat, lng, language])

  return { address, loading }
}
