'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { Post } from '@/lib/types'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { formatLocaleDate } from '@/lib/date-locale'
import { Eye, Image as ImageIcon, Filter, X, MapPin, Copy, Check, CheckCircle } from 'lucide-react'
import { generateArabicMessage } from '@/lib/maps'
import ImageModal from '@/components/ImageModal'

export interface MapFilters {
  category: string
  status: string
  dateRange: string
  customStartDate: string
  customEndDate: string
}

interface MapViewProps {
  posts: Post[]
  center?: [number, number]
  zoom?: number
  /** When set, map flies to this post (e.g. from list click) */
  selectedPostId?: string | null
  /** Called after post status is updated (e.g. processing / completed) so parent can refetch */
  onPostUpdated?: () => void
  /** When provided, map filter state is controlled by parent (sync with list). Posts are expected to be already filtered server-side. */
  filters?: MapFilters
  onFiltersChange?: (filters: MapFilters) => void
}

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)

// Survives unmount/remount (e.g. Strict Mode) so remount gets a new container key
let nextMapId = 0

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

// Wraps Marker and opens its popup when this post is selected (e.g. from list click)
function MarkerWithPopupOpen({
  postId,
  selectedPostId,
  position,
  icon,
  onMarkerClick,
  children,
}: {
  postId: string
  selectedPostId: string | null
  position: [number, number]
  icon: L.DivIcon | undefined
  onMarkerClick?: (postId: string) => void
  children: React.ReactNode
}) {
  const markerRef = useRef<L.Marker | null>(null)
  useEffect(() => {
    if (selectedPostId !== postId) return
    const t = setTimeout(() => {
      ;(markerRef.current as L.Marker & { openPopup?: () => void })?.openPopup?.()
    }, 550)
    return () => clearTimeout(t)
  }, [selectedPostId, postId])

  // When marker is clicked (e.g. user opens popup from map), notify parent to set processing
  useEffect(() => {
    const m = markerRef.current
    if (!m || !onMarkerClick) return
    const handler = () => onMarkerClick(postId)
    ;(m as L.Marker).on('click', handler)
    return () => {
      ;(m as L.Marker).off('click', handler)
    }
  }, [postId, onMarkerClick])

  return (
    <Marker ref={markerRef} position={position} icon={icon}>
      {children}
    </Marker>
  )
}

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

// Dynamically import FitBounds and FlyToPost to avoid SSR
const FitBounds = dynamic(() => Promise.resolve(FitBoundsComponent), { ssr: false })
const MapFlyToPost = dynamic(
  () => import('@/components/MapFlyToPost').then((m) => m.default),
  { ssr: false }
)

const DEFAULT_MAP_FILTERS: MapFilters = {
  category: 'all',
  status: 'all',
  dateRange: 'all',
  customStartDate: '',
  customEndDate: '',
}

export default function MapView({
  posts,
  center = [36.2021, 37.1343],
  zoom = 12,
  selectedPostId = null,
  onPostUpdated,
  filters: controlledFilters,
  onFiltersChange,
}: MapViewProps) {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const tMap = useTranslations('map')
  const tPosts = useTranslations('posts')
  const tCommon = useTranslations('common')
  const [mounted, setMounted] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapContainerKey, setMapContainerKey] = useState('')
  const [L, setL] = useState<any>(null)
  const [internalFilters, setInternalFilters] = useState<MapFilters>(DEFAULT_MAP_FILTERS)
  const isControlled = controlledFilters != null && onFiltersChange != null
  const selectedCategory = isControlled ? controlledFilters.category : internalFilters.category
  const selectedStatus = isControlled ? controlledFilters.status : internalFilters.status
  const selectedDateRange = isControlled ? controlledFilters.dateRange : internalFilters.dateRange
  const customStartDate = isControlled ? controlledFilters.customStartDate : internalFilters.customStartDate
  const customEndDate = isControlled ? controlledFilters.customEndDate : internalFilters.customEndDate
  const setSelectedCategory = (v: string) =>
    isControlled ? onFiltersChange!({ ...controlledFilters, category: v }) : setInternalFilters((f) => ({ ...f, category: v }))
  const setSelectedStatus = (v: string) =>
    isControlled ? onFiltersChange!({ ...controlledFilters, status: v }) : setInternalFilters((f) => ({ ...f, status: v }))
  const setSelectedDateRange = (v: string) =>
    isControlled ? onFiltersChange!({ ...controlledFilters, dateRange: v }) : setInternalFilters((f) => ({ ...f, dateRange: v }))
  const setCustomStartDate = (v: string) =>
    isControlled ? onFiltersChange!({ ...controlledFilters, customStartDate: v }) : setInternalFilters((f) => ({ ...f, customStartDate: v }))
  const setCustomEndDate = (v: string) =>
    isControlled ? onFiltersChange!({ ...controlledFilters, customEndDate: v }) : setInternalFilters((f) => ({ ...f, customEndDate: v }))
  const [showFilters, setShowFilters] = useState(true)
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null)
  const [completingPostId, setCompletingPostId] = useState<string | null>(null)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [imageViewerUrls, setImageViewerUrls] = useState<string[]>([])
  const [imageViewerIndex, setImageViewerIndex] = useState(0)

  const handleMarkerClick = useMemo(
    () => async (postId: string) => {
      const post = posts.find((p) => (p._id || p.id) === postId)
      if (post?.status === 'completed' || post?.status === 'processing') return
      try {
        await api.patch(`/posts/${postId}`, { status: 'processing' })
        onPostUpdated?.()
      } catch (e) {
        console.error('Failed to set processing:', e)
      }
    },
    [onPostUpdated, posts]
  )

  const handleCompletePost = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCompletingPostId(postId)
    try {
      await api.patch(`/posts/${postId}`, { status: 'completed' })
      onPostUpdated?.()
    } catch (e) {
      console.error('Failed to complete post:', e)
    } finally {
      setCompletingPostId(null)
    }
  }

  const categories = useMemo(
    () => [
      { value: 'all', label: tMap('allCategories') },
      { value: 'road', label: tMap('categories.road') },
      { value: 'electricity', label: tMap('categories.electricity') },
      { value: 'street_light', label: tMap('categories.street_light') },
      { value: 'building', label: tMap('categories.building') },
      { value: 'wall', label: tMap('categories.wall') },
      { value: 'water', label: tMap('categories.water') },
      { value: 'mine', label: tMap('categories.mine') },
    ],
    [tMap]
  )

  const dateRanges = useMemo(
    () => [
      { value: 'all', label: tMap('allTime') },
      { value: 'today', label: tMap('today') },
      { value: 'week', label: tMap('last7Days') },
      { value: 'month', label: tMap('last30Days') },
      { value: 'custom', label: tMap('customRange') },
    ],
    [tMap]
  )

  const statuses = useMemo(
    () => [
      { value: 'all', label: tMap('allStatuses') },
      { value: 'pending', label: tPosts('status.pending') },
      { value: 'processing', label: tPosts('status.processing') },
      { value: 'completed', label: tPosts('status.completed') },
      // { value: 'approved', label: tPosts('status.approved') },
      { value: 'rejected', label: tPosts('status.rejected') },
      // { value: 'published', label: tPosts('status.published') },
    ],
    [tMap, tPosts]
  )

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

  // Defer map render until after first commit so Strict Mode doesn't double-mount
  useEffect(() => {
    if (!mounted || !leafletLoaded) return
    const id = requestAnimationFrame(() => setMapReady(true))
    return () => {
      cancelAnimationFrame(id)
      setMapReady(false)
    }
  }, [mounted, leafletLoaded])

  // When we show the map, assign a key from module id; on unmount bump id so remount gets fresh container
  useEffect(() => {
    if (!mapReady) return
    setMapContainerKey(`map-${nextMapId}`)
    return () => {
      nextMapId += 1
    }
  }, [mapReady])

  // When controlled, posts are already filtered server-side; only keep those with location for map display
  const filteredPosts = useMemo(() => {
    const withLocation = posts.filter(
      (post) => post.location && post.location.latitude && post.location.longitude
    )
    if (isControlled) return withLocation
    // Uncontrolled: client-side filter by category, status, date
    let filtered = withLocation
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((post) => post.category === selectedCategory)
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((post) => post.status === selectedStatus)
    } else {
      filtered = filtered.filter((post) => post.status !== 'rejected')
    }
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
  }, [posts, isControlled, selectedCategory, selectedStatus, selectedDateRange, customStartDate, customEndDate])

  const postsWithLocation = filteredPosts

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
      case 'completed':
        return '#16A34A'
      case 'approved':
        return '#1E3A8A'
      case 'processing':
        return '#2563EB'
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
      <div className="w-full h-full bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-300">{tMap('loadingMap')}</p>
      </div>
    )
  }

  if (filteredPosts.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 dark:bg-gray-900 rounded-lg flex flex-col items-center justify-center">
        <p className="text-gray-500 dark:text-gray-300 mb-2">{tMap('noPostsMatch')}</p>
        {(selectedCategory !== 'all' || selectedStatus !== 'all' || selectedDateRange !== 'all') && (
          <button
            onClick={() => {
              if (isControlled) onFiltersChange!(DEFAULT_MAP_FILTERS)
              else {
                setSelectedCategory('all')
                setSelectedStatus('all')
                setSelectedDateRange('all')
                setCustomStartDate('')
                setCustomEndDate('')
              }
            }}
            className="text-sm text-primary hover:underline"
          >
            {tMap('clearFilters')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 relative">
      {/* Filter Panel */}
      <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-4 max-w-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-text dark:text-gray-100">{tMap('filters')}</h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={showFilters ? tMap('hideFilters') : tMap('showFilters')}
          >
            {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Category Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                {tMap('categoryLabel')}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                {tMap('statusLabel')}
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                {tMap('dateRangeLabel')}
              </label>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-2"
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
                    <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">{tMap('startDate')}</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">{tMap('endDate')}</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {(selectedCategory !== 'all' || selectedStatus !== 'all' || selectedDateRange !== 'all') && (
                <button
                  onClick={() => {
                    if (isControlled) onFiltersChange!(DEFAULT_MAP_FILTERS)
                    else {
                      setSelectedCategory('all')
                      setSelectedStatus('all')
                      setSelectedDateRange('all')
                      setCustomStartDate('')
                      setCustomEndDate('')
                    }
                  }}
                  className="w-full mt-2 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-50 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {tMap('clearFilters')}
                </button>
              )}
            </div>

            {/* Results Count */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {tMap('showingCount', {
                  count: filteredPosts.length,
                  total: posts.filter((p) => p.location).length,
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {mapReady && mapContainerKey ? (
      <div key={mapContainerKey} style={{ height: '100%', width: '100%' }}>
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
        <MapFlyToPost selectedPostId={selectedPostId} posts={filteredPosts} />
        {filteredPosts.map((post) => {
          const icon = createCustomIcon(post)
          if (!icon || !post.location?.latitude || !post.location?.longitude) return null
          const postId = post._id || post.id || ''
          const position: [number, number] = [post.location.latitude, post.location.longitude]
          return (
            <MarkerWithPopupOpen
              key={postId}
              postId={postId}
              selectedPostId={selectedPostId}
              position={position}
              icon={icon}
              onMarkerClick={onPostUpdated ? handleMarkerClick : undefined}
            >
              <Popup>
                <div className="p-3 min-w-[240px]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm text-text dark:text-gray-100 flex-1 min-w-0">{post.title}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleCompletePost(postId, e)}
                        disabled={completingPostId === postId || post.status === 'completed'}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title={tMap('markComplete')}
                      >
                        {completingPostId === postId ? (
                          <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={`/${locale}/posts/${post._id || post.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                        title={tMap('viewDetails')}
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  
                  {post.content && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{post.content}</p>
                  )}
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{tMap('categoryLabelShort')}:</span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary capitalize border border-primary/20">
                        {post.category ? tMap(`categories.${post.category}`) : post.category}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{tMap('statusLabelShort')}:</span>
                      <span
                        className="px-2.5 py-1 rounded-md text-xs font-medium border"
                        style={{
                          backgroundColor: `${getStatusColor(post.status)}15`,
                          color: getStatusColor(post.status),
                          borderColor: `${getStatusColor(post.status)}30`,
                        }}
                      >
                        {post.status ? tPosts(`status.${post.status}`) : post.status}
                      </span>
                    </div>
                    
                    {post.images && post.images.length > 0 && (() => {
                      const urls = post.images
                        .map((img) => (typeof img === 'string' ? img : (img as { publicUrl?: string; localUrl?: string }).publicUrl || ((img as { localUrl?: string }).localUrl?.startsWith('http') ? (img as { localUrl: string }).localUrl : null)))
                        .filter(Boolean) as string[]
                      return urls.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setImageViewerUrls(urls)
                            setImageViewerIndex(0)
                            setImageViewerOpen(true)
                          }}
                          className="flex items-center gap-2 text-left hover:underline text-gray-600 dark:text-gray-300"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                          <span>
                            {tMap('imagesCount', { count: urls.length })} — {tMap('view')}
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300">
                            {tMap('imagesCountLocal', { count: post.images.length })}
                          </span>
                        </div>
                      )
                    })()}
                    
                    {post.authorName && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{tMap('authorLabel')}:</span>
                        <span className="text-gray-600 dark:text-gray-300">{post.authorName}</span>
                      </div>
                    )}
                    
                    {post.location && (
                      <div className="space-y-2">
                        {post.location.address && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{tMap('addressLabel')}:</span>
                            <span className="text-gray-600 dark:text-gray-300 text-[11px] leading-tight">{post.location.address}</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleCopyUrl(post)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium transition-colors border border-blue-200 dark:border-blue-500/50 w-full"
                        >
                          {copiedPostId === (post._id || post.id) ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{tCommon('copied')}</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{tMap('copyGoogleMapsUrl')}</span>
                              <Copy className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-gray-500">
                      <span className="text-gray-500 dark:text-gray-300 text-[11px]">
                        {formatLocaleDate(post.createdAt, 'MMM d, yyyy', locale)}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </MarkerWithPopupOpen>
          )
        })}
        </MapContainer>
      </div>
      ) : (
        <div className="w-full h-full min-h-[400px] bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-300">{tMap('loadingMap')}</p>
        </div>
      )}

      <ImageModal
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        images={imageViewerUrls}
        currentIndex={imageViewerIndex}
        onIndexChange={setImageViewerIndex}
        alt="Report"
      />
    </div>
  )
}
