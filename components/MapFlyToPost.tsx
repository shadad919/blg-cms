'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { Post } from '@/lib/types'

interface MapFlyToPostProps {
  selectedPostId: string | null
  posts: Post[]
}

function getPostCoords(post: Post): [number, number] | null {
  const loc = post.location
  if (!loc) return null
  const anyLoc = loc as Record<string, unknown>
  let lat: number | undefined
  let lng: number | undefined
  if (typeof anyLoc.latitude === 'number' && typeof anyLoc.longitude === 'number') {
    lat = anyLoc.latitude
    lng = anyLoc.longitude
  } else if (typeof anyLoc.lat === 'number' && typeof anyLoc.lng === 'number') {
    lat = anyLoc.lat
    lng = anyLoc.lng
  }
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return [lat, lng]
}

export default function MapFlyToPost({ selectedPostId, posts }: MapFlyToPostProps) {
  const map = useMap()

  useEffect(() => {
    if (!selectedPostId || !map) return
    const post = posts.find((p) => (p._id || p.id) === selectedPostId)
    const coords = post ? getPostCoords(post) : null
    if (!coords) return

    map.flyTo(coords, 16, { duration: 0.5 })

    // After fly completes, find the marker at this position and open its popup
    const openPopupTimer = setTimeout(() => {
      const [lat, lng] = coords
      map.eachLayer((layer: unknown) => {
        const marker = layer as { getLatLng?: () => { lat: number; lng: number }; openPopup?: () => void }
        if (marker?.getLatLng && typeof marker.openPopup === 'function') {
          const pos = marker.getLatLng()
          if (pos && Math.abs(pos.lat - lat) < 1e-6 && Math.abs(pos.lng - lng) < 1e-6) {
            marker.openPopup()
          }
        }
      })
    }, 600)

    return () => clearTimeout(openPopupTimer)
  }, [selectedPostId, posts, map])

  return null
}
