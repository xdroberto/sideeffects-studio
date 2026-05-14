'use client'

import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import galleryData from '@/data/gallery.json'

// ─── Types ──────────────────────────────────────────────────────────
// Mirror of the discriminated union in lib/gallery-data.ts. Kept inline
// because this is a client component and the lib module is server-only.

type MediaType = 'image' | 'video-mp4' | 'video-youtube'

interface ArtworkBase {
  id: string
  title: string
  description?: string
  featured?: boolean
  aspectRatio?: string
}
type ArtworkImage = ArtworkBase & { mediaType: 'image'; imagePath: string }
type ArtworkVideoMp4 = ArtworkBase & { mediaType: 'video-mp4'; videoPath: string; posterPath?: string }
type ArtworkYouTube = ArtworkBase & { mediaType: 'video-youtube'; youtubeId: string; posterPath?: string }
type Artwork = ArtworkImage | ArtworkVideoMp4 | ArtworkYouTube

// ─── Initial data: commited gallery.json (source of truth in static export).
// In dev mode, the useEffect below tries the admin API to pick up edits made
// from /admin/gallery without restarting; if it fails (e.g. static export
// where the API doesn't exist), we keep the json items silently.

// ─── Image error fallback ───────────────────────────────────────────
const PLACEHOLDER_IMG = '/uploads/placeholder.svg'

// ─── Sanitize text ──────────────────────────────────────────────────
function sanitize(input: unknown, max = 200): string {
  if (typeof input !== 'string') return ''
  return input.slice(0, max).trim()
}

// ─── Normalize API payload into discriminated Artwork ───────────────
function normalizeItem(raw: any): Artwork | null {
  if (!raw || typeof raw !== 'object') return null
  const base = {
    id: String(raw.id),
    title: sanitize(raw.title, 100),
    description: sanitize(raw.description) || undefined,
    featured: Boolean(raw.featured),
    aspectRatio: raw.aspectRatio,
  }
  const mediaType: MediaType = raw.mediaType === 'video-mp4' || raw.mediaType === 'video-youtube'
    ? raw.mediaType
    : 'image'

  if (mediaType === 'image') {
    return { ...base, mediaType: 'image', imagePath: raw.imagePath || PLACEHOLDER_IMG }
  }
  if (mediaType === 'video-mp4') {
    if (!raw.videoPath) return null
    return {
      ...base,
      mediaType: 'video-mp4',
      videoPath: String(raw.videoPath),
      posterPath: raw.posterPath ? String(raw.posterPath) : undefined,
    }
  }
  // video-youtube
  if (!raw.youtubeId) return null
  return {
    ...base,
    mediaType: 'video-youtube',
    youtubeId: String(raw.youtubeId),
    posterPath: raw.posterPath ? String(raw.posterPath) : undefined,
  }
}

// ─── Resolve the tile thumbnail for any variant ─────────────────────
function getTileThumb(item: Artwork): string {
  if (item.mediaType === 'image') return item.imagePath
  if (item.mediaType === 'video-mp4') return item.posterPath || PLACEHOLDER_IMG
  // YouTube: prefer override poster, else maxres thumbnail
  return item.posterPath || `https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`
}

// ─── Component ──────────────────────────────────────────────────────
// Map the committed JSON at module-eval time so the initial render is correct
// (no flash of fallback content in static export).
const INITIAL_ARTWORKS: Artwork[] = ((galleryData as { items?: unknown[] }).items ?? [])
  .map(normalizeItem)
  .filter((it): it is Artwork => it !== null)

export function Gallery() {
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [galleryItems, setGalleryItems] = useState<Artwork[]>(INITIAL_ARTWORKS)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const MotionDiv = motion.div as any

  // Try to pick up live edits from /admin/gallery (only meaningful in dev mode
  // — in static export the API is excluded and the fetch fails silently).
  useEffect(() => {
    let cancelled = false
    const fetchItems = async () => {
      try {
        const res = await fetch('/api/admin/gallery')
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (Array.isArray(data.items) && data.items.length > 0) {
          const mapped = data.items
            .map(normalizeItem)
            .filter((it: Artwork | null): it is Artwork => it !== null)
          if (mapped.length > 0 && !cancelled) setGalleryItems(mapped)
        }
      } catch {
        // Silent: expected in static export (no admin API in production build).
      }
    }
    fetchItems()
    return () => { cancelled = true }
  }, [])

  const handleImageError = useCallback((id: string) => {
    setImageErrors(prev => new Set(prev).add(id))
  }, [])

  const closeModal = useCallback(() => setSelectedArtwork(null), [])

  // Close modal on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeModal])

  if (galleryItems.length === 0) {
    return (
      <div className="w-full bg-black py-24 text-center">
        <p className="text-gray-500 text-lg">No artworks yet.</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-black" ref={containerRef}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 auto-rows-[140px] sm:auto-rows-[180px]">
          {galleryItems.map((artwork) => {
            const isVideo = artwork.mediaType !== 'image'
            const errored = imageErrors.has(artwork.id)
            const rawThumb = getTileThumb(artwork)
            const tileSrc = errored ? PLACEHOLDER_IMG : rawThumb
            const isRemoteThumb = tileSrc.startsWith('http')
            const variantBadge =
              artwork.mediaType === 'video-mp4' ? 'VIDEO'
                : artwork.mediaType === 'video-youtube' ? 'YOUTUBE'
                  : null

            return (
              <MotionDiv
                key={artwork.id}
                className={`relative cursor-pointer bg-neutral-900 overflow-hidden rounded-[20px] group transition-shadow duration-300 ease-out hover:shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_8px_30px_-12px_rgba(239,68,68,0.35)] focus-visible:shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_8px_30px_-12px_rgba(239,68,68,0.35)] ${artwork.featured ? 'col-span-2 row-span-2' : ''}`}
                onClick={() => setSelectedArtwork(artwork)}
                onKeyDown={(e: ReactKeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedArtwork(artwork)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open ${artwork.title}${isVideo ? ' (video)' : ''}`}
                whileHover={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                {/* Tile media: always a still poster/thumb — no autoplay */}
                {isRemoteThumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tileSrc}
                    alt={artwork.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={() => handleImageError(artwork.id)}
                  />
                ) : (
                  <Image
                    src={tileSrc}
                    alt={artwork.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={() => handleImageError(artwork.id)}
                  />
                )}

                {/* Play badge for video items — bottom-left, subtle */}
                {variantBadge && (
                  <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 pointer-events-none">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    <span className="text-white text-[10px] tracking-[0.12em] font-mono">{variantBadge}</span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-sm md:text-base font-medium">{artwork.title}</p>
                    {artwork.description && (
                      <p className="text-gray-300 text-xs md:text-sm mt-1 line-clamp-2">{artwork.description}</p>
                    )}
                  </div>
                </div>
              </MotionDiv>
            )
          })}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedArtwork && (() => {
          const item = selectedArtwork
          const errored = imageErrors.has(item.id)

          return (
            <MotionDiv
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            >
              <MotionDiv
                className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center p-4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e: any) => e.stopPropagation()}
              >
                {/* Media content */}
                <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                  {item.mediaType === 'video-youtube' ? (
                    // YouTube embed — mounted only when lightbox opens
                    <div className="w-full" style={{ maxWidth: '960px', aspectRatio: '16/9' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=0&rel=0`}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={item.title}
                      />
                    </div>
                  ) : item.mediaType === 'video-mp4' ? (
                    // Self-hosted video — no autoplay (better mobile + a11y UX)
                    <video
                      src={item.videoPath}
                      controls
                      playsInline
                      poster={item.posterPath}
                      className="max-w-full max-h-[80vh] rounded-lg w-full"
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    // Image
                    <div className="relative w-full" style={{ height: '80vh' }}>
                      {item.imagePath.startsWith('http') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={errored ? PLACEHOLDER_IMG : item.imagePath}
                          alt={item.title}
                          className="absolute inset-0 w-full h-full object-contain"
                          onError={() => handleImageError(item.id)}
                        />
                      ) : (
                        <Image
                          src={errored ? PLACEHOLDER_IMG : item.imagePath}
                          alt={item.title}
                          fill
                          className="object-contain"
                          onError={() => handleImageError(item.id)}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Text info with solid gradient backdrop */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-16 pb-8 px-4 text-center">
                  <h3 className="text-white text-xl md:text-2xl font-light">{item.title}</h3>
                  {item.description && (
                    <p className="text-gray-300 text-sm md:text-base mt-2 max-w-lg mx-auto">{item.description}</p>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 text-white hover:text-signal transition-colors duration-200 ease-out z-10"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </MotionDiv>
            </MotionDiv>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
