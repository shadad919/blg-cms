'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Post } from '@/lib/types'
import { format } from 'date-fns'

interface MapViewProps {
  posts: Post[]
  center?: [number, number]
  zoom?: number
}

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

// Component to fit bounds - must be inside MapContainer
// This component uses useMap hook which must be called unconditionally
function FitBoundsComponent({ posts }: { posts: Post[] }) {
  const [useMapHook, setUseMapHook] = useState<(() => any) | null>(null)
  const [map, setMap] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-leaflet').then((mod) => {
        setUseMapHook(() => mod.useMap)
      })
    }
  }, [])

  // Call useMap hook unconditionally once it's loaded
  useEffect(() => {
    if (useMapHook) {
      try {
        const mapInstance = useMapHook()
        setMap(mapInstance)
      } catch (e) {
        // Hook can only be called inside MapContainer context
        console.warn('useMap hook not available in context')
      }
    }
  }, [useMapHook])

  useEffect(() => {
    if (!map || posts.length === 0) return

    const bounds = posts
      .filter((post) => post.location && post.location.latitude && post.location.longitude)
      .map((post) => [post.location?.latitude || 0, post.location?.longitude || 0] as [number, number])
      .filter(([lat, lng]) => lat !== 0 && lng !== 0)

    if (bounds.length > 0) {
      setTimeout(() => {
        map.fitBounds(bounds, { padding: [50, 50] })
      }, 100)
    }
  }, [posts, map])

  return null
}

// Dynamically import FitBounds to avoid SSR
const FitBounds = dynamic(() => Promise.resolve(FitBoundsComponent), { ssr: false })

export default function MapView({ posts, center = [36.2021, 37.1343], zoom = 12 }: MapViewProps) {
  const [mounted, setMounted] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [L, setL] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      // Fix for default marker icons in Next.js
      import('leaflet').then((leafletModule) => {
        const Leaflet = leafletModule.default
        delete (Leaflet.Icon.Default.prototype as any)._getIconUrl
        Leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
        setL(Leaflet)
        setLeafletLoaded(true)
      })
    }
  }, [])

  const postsWithLocation = posts.filter(
    (post) => post.location && post.location.latitude && post.location.longitude
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return '#16A34A'
      case 'approved':
        return '#1E3A8A'
      case 'pending':
        return '#F59E0B'
      case 'rejected':
        return '#DC2626'
      default:
        return '#6B7280'
    }
  }

  const getCategoryIcon = (category: string) => {
    // In Next.js, files in app/assets are served from /assets/ path
    const iconMap: Record<string, string> = {
      road: '/assets/noun-damage-road-4092221.svg',
      electricity: '/assets/electricity.svg',
      street_light: '/assets/street_light.svg',
      building: '/assets/building.svg',
      wall: '/assets/wall.svg',
      water: '/assets/water.svg',
      mine: '/assets/mine.svg',
    }
    return iconMap[category] || iconMap.road
  }

  const createCustomIcon = (post: Post) => {
    if (typeof window === 'undefined' || !leafletLoaded || !L) return null
    
    const statusColor = getStatusColor(post.status)
    const categoryIcon = getCategoryIcon(post.category)
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        position: relative;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 48px;
          height: 48px;
          background-color: ${statusColor};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <img 
            src="${categoryIcon}" 
            alt="${post.category}"
            style="
              width: 28px;
              height: 28px;
              filter: brightness(0) invert(1);
              object-fit: contain;
              pointer-events: none;
            "
            loading="eager"
            onerror="this.style.display='none'"
          />
        </div>
      </div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
    })
  }

  if (!mounted) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }

  if (postsWithLocation.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No posts with location data available</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds posts={postsWithLocation} />
        {postsWithLocation.map((post) => {
          const icon = createCustomIcon(post)
          if (!icon || !post.location) return null
          return (
            <Marker
              key={post._id || post.id}
              position={[post.location?.latitude || 0, post.location?.longitude || 0]}
              icon={icon}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-sm mb-1">{post.title}</h3>
                  {post.content && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{post.content}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Category:</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary capitalize">
                        {post.category.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: `${getStatusColor(post.status)}20`,
                          color: getStatusColor(post.status),
                        }}
                      >
                        {post.status}
                      </span>
                    </div>
                    {post.authorName && (
                      <div>
                        <span className="font-medium">Author:</span> {post.authorName}
                      </div>
                    )}
                    {post.location?.address && (
                      <div>
                        <span className="font-medium">Address:</span> {post.location?.address}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {format(new Date(post.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
