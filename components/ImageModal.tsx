'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

const SWIPE_THRESHOLD = 50

export interface ImageModalProps {
  open: boolean
  onClose: () => void
  /** Single image URL, or use images + currentIndex for gallery */
  src?: string
  /** Multiple images for gallery mode */
  images?: string[]
  /** Current index when using images array */
  currentIndex?: number
  /** Callback when current index changes (e.g. for controlled gallery) */
  onIndexChange?: (index: number) => void
  alt?: string
}

export default function ImageModal({
  open,
  onClose,
  src,
  images,
  currentIndex = 0,
  onIndexChange,
  alt = 'Image',
}: ImageModalProps) {
  const urls = images && images.length > 0 ? images : src ? [src] : []
  const index = Math.min(Math.max(0, currentIndex), Math.max(0, urls.length - 1))
  const currentSrc = urls[index]
  const touchStartX = useRef<number>(0)
  const touchCurrentX = useRef<number>(0)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const goPrev = useCallback(() => {
    if (urls.length <= 1) return
    const next = index <= 0 ? urls.length - 1 : index - 1
    onIndexChange?.(next)
  }, [urls.length, index, onIndexChange])

  const goNext = useCallback(() => {
    if (urls.length <= 1) return
    const next = index >= urls.length - 1 ? 0 : index + 1
    onIndexChange?.(next)
  }, [urls.length, index, onIndexChange])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const x = e.touches[0].clientX
    touchStartX.current = x
    touchCurrentX.current = x
    setSwipeOffset(0)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (urls.length <= 1) return
    const x = e.touches[0].clientX
    touchCurrentX.current = x
    setSwipeOffset(x - touchStartX.current)
  }, [urls.length])

  const handleTouchEnd = useCallback(() => {
    if (urls.length <= 1) {
      setSwipeOffset(0)
      return
    }
    const dx = touchCurrentX.current - touchStartX.current
    setSwipeOffset(0)
    if (dx > SWIPE_THRESHOLD) goPrev()
    else if (dx < -SWIPE_THRESHOLD) goNext()
  }, [urls.length, goPrev, goNext])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Image count: always visible */}
      <div className="absolute left-4 top-4 z-10 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white/90">
        {urls.length === 1 ? '1 image' : `Image ${index + 1} of ${urls.length}`}
      </div>

      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <div
        className="relative max-h-full max-w-full flex items-center justify-center touch-none select-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: urls.length > 1 ? 'grab' : 'default' }}
      >
        {currentSrc ? (
          <img
            src={currentSrc}
            alt={alt}
            className="max-h-[90vh] max-w-full object-contain rounded-lg transition-transform duration-75"
            style={{ transform: `translateX(${swipeOffset}px)` }}
            draggable={false}
          />
        ) : null}
      </div>
    </div>
  )
}
