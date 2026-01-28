'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { Post } from '@/lib/types'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { Eye, Image as ImageIcon, Filter, X, MapPin, Copy, Check } from 'lucide-react'
import { generateArabicMessage } from '@/lib/maps'

interface MapViewProps {
  posts: Post[]
  center?: [number, number]
  zoom?: number
}

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'road', label: 'Road' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'street_light', label: 'Street Light' },
  { value: 'building', label: 'Building' },
  { value: 'wall', label: 'Wall' },
  { value: 'water', label: 'Water' },
  { value: 'mine', label: 'Mine' },
]

const dateRanges = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
]

const statuses = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'published', label: 'Published' },
]

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
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [mounted, setMounted] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [L, setL] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showFilters, setShowFilters] = useState(true)
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null)

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

  // Filter posts based on category, status, and date
  const filteredPosts = useMemo(() => {
    let filtered = posts.filter(
      (post) => post.location && post.location.latitude && post.location.longitude
    )

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((post) => post.category === selectedCategory)
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((post) => post.status === selectedStatus)
    }

    // Filter by date range
    if (selectedDateRange !== 'all') {
      const now = new Date()
      let startDate: Date
      let endDate = endOfDay(now)

      switch (selectedDateRange) {
        case 'today':
          startDate = startOfDay(now)
          break
        case 'week':
          startDate = startOfDay(subDays(now, 7))
          break
        case 'month':
          startDate = startOfDay(subDays(now, 30))
          break
        case 'custom':
          if (customStartDate && customEndDate) {
            startDate = startOfDay(new Date(customStartDate))
            endDate = endOfDay(new Date(customEndDate))
          } else {
            return filtered
          }
          break
        default:
          return filtered
      }

      filtered = filtered.filter((post) => {
        const postDate = new Date(post.createdAt)
        return postDate >= startDate && postDate <= endDate
      })
    }

    return filtered
  }, [posts, selectedCategory, selectedStatus, selectedDateRange, customStartDate, customEndDate])

  const postsWithLocation = filteredPosts

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'mine':
        return '#DC2626' // Red
      case 'electricity':
        return '#FCD34D' // Yellow
      case 'water':
        return '#3B82F6' // Blue
      case 'building':
        return '#9333EA' // Purple
      case 'road':
        return '#F97316' // Orange
      case 'street_light':
        return '#F59E0B' // Amber
      case 'wall':
        return '#78716C' // Brown/Gray
      default:
        return '#6B7280' // Gray
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

  const handleCopyUrl = async (post: Post) => {
    if (!post.location) return
    
    const message = generateArabicMessage({
      title: post.title,
      content: post.content,
      category: post.category,
      location: post.location,
    })
    
    try {
      await navigator.clipboard.writeText(message)
      const postId = post._id || post.id || ''
      setCopiedPostId(postId)
      setTimeout(() => setCopiedPostId(null), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const createCustomIcon = (post: Post) => {
    if (typeof window === 'undefined' || !leafletLoaded || !L) return null
    
    const categoryColor = getCategoryColor(post.category)
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
          background-color: ${categoryColor};
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

  if (filteredPosts.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-lg flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-2">No posts match the selected filters</p>
        {(selectedCategory !== 'all' || selectedStatus !== 'all' || selectedDateRange !== 'all') && (
          <button
            onClick={() => {
              setSelectedCategory('all')
              setSelectedStatus('all')
              setSelectedDateRange('all')
              setCustomStartDate('')
              setCustomEndDate('')
            }}
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 relative">
      {/* Filter Panel */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-text">Filters</h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
            title={showFilters ? 'Hide Filters' : 'Show Filters'}
          >
            {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Category Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-2"
              >
                {dateRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>

              {selectedDateRange === 'custom' && (
                <div className="space-y-2 mt-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {(selectedCategory !== 'all' || selectedStatus !== 'all' || selectedDateRange !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedCategory('all')
                    setSelectedStatus('all')
                    setSelectedDateRange('all')
                    setCustomStartDate('')
                    setCustomEndDate('')
                  }}
                  className="w-full mt-2 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Results Count */}
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Showing <span className="font-semibold text-primary">{filteredPosts.length}</span> of{' '}
                <span className="font-semibold">{posts.filter((p) => p.location).length}</span> posts
              </p>
            </div>
          </div>
        )}
      </div>

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
        <FitBounds posts={filteredPosts} />
        {filteredPosts.map((post) => {
          const icon = createCustomIcon(post)
          if (!icon || !post.location) return null
          return (
            <Marker
              key={post._id || post.id}
              position={[post.location?.latitude || 0, post.location?.longitude || 0]}
              icon={icon}
            >
              <Popup>
                <div className="p-3 min-w-[240px]">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm text-text flex-1 pr-2">{post.title}</h3>
                    <a
                      href={`/${locale}/posts/${post._id || post.id}`}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </div>
                  
                  {post.content && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{post.content}</p>
                  )}
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Category:</span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary capitalize border border-primary/20">
                        {post.category.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Status:</span>
                      <span
                        className="px-2.5 py-1 rounded-md text-xs font-medium border"
                        style={{
                          backgroundColor: `${getStatusColor(post.status)}15`,
                          color: getStatusColor(post.status),
                          borderColor: `${getStatusColor(post.status)}30`,
                        }}
                      >
                        {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                      </span>
                    </div>
                    
                    {post.images && post.images.length > 0 && (
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-600">
                          <span className="font-medium">{post.images.length}</span>{' '}
                          {post.images.length === 1 ? 'image' : 'images'}
                        </span>
                      </div>
                    )}
                    
                    {post.authorName && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Author:</span>
                        <span className="text-gray-600">{post.authorName}</span>
                      </div>
                    )}
                    
                    {post.location && (
                      <div className="space-y-2">
                        {post.location.address && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-gray-700">Address:</span>
                            <span className="text-gray-600 text-[11px] leading-tight">{post.location.address}</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleCopyUrl(post)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-colors border border-blue-200 w-full"
                        >
                          {copiedPostId === (post._id || post.id) ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Copy Google Maps URL</span>
                              <Copy className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                      <span className="text-gray-500 text-[11px]">
                        {format(new Date(post.createdAt), 'MMM d, yyyy')}
                      </span>
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
