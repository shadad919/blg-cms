'use client'

import { useAddressFromCoords } from '@/lib/useAddressFromCoords'

interface AddressDisplayProps {
  latitude: number
  longitude: number
  existingAddress?: string | null
  language?: string
  /** When true, render as inline text (e.g. for dashboard list). When false, render with label (e.g. post detail). */
  inline?: boolean
  className?: string
}

/**
 * Shows address: uses existingAddress if present, otherwise reverse-geocodes lat/lng via OpenCage.
 */
export default function AddressDisplay({
  latitude,
  longitude,
  existingAddress,
  language = 'en',
  inline = true,
  className = '',
}: AddressDisplayProps) {
  const { address: fetchedAddress, loading } = useAddressFromCoords(
    existingAddress?.trim() ? undefined : latitude,
    existingAddress?.trim() ? undefined : longitude,
    language
  )

  const display = existingAddress?.trim() ?? fetchedAddress ?? null
  const fallback = `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`

  if (inline) {
    if (loading) return <span className={className}>…</span>
    return <span className={className}>{display || fallback}</span>
  }

  if (loading) return <p className={className}>Loading address…</p>
  return <p className={className}>{display || fallback}</p>
}
