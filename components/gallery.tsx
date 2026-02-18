'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

// ─── Types ──────────────────────────────────────────────────────────
interface Artwork {
  id: string
  title: string
  description?: string
  imagePath: string
  featured?: boolean
  aspectRatio?: string
}

// ─── Fallback data ──────────────────────────────────────────────────
const FALLBACK_ARTWORKS: Artwork[] = [
  { id: '1', imagePath: 'https://picsum.photos/seed/1/800/600', title: 'Digital Waves', description: 'Generative ocean patterns driven by noise algorithms.', featured: true },
  { id: '2', imagePath: 'https://picsum.photos/seed/2/800/600', title: 'Fractal Dimensions', description: 'Recursive structures revealing infinite complexity.' },
  { id: '3', imagePath: 'https://picsum.photos/seed/3/800/600', title: 'Neural Patterns', description: 'Visualizing the hidden layers of machine learning.' },
  { id: '4', imagePath: 'https://picsum.photos/seed/4/800/600', title: 'Quantum Flow', description: 'Particle simulations inspired by quantum mechanics.' },
  { id: '5', imagePath: 'https://picsum.photos/seed/5/800/600', title: 'Digital Nebula', description: 'Cosmic dust rendered through procedural generation.' },
  { id: '6', imagePath: 'https://picsum.photos/seed/6/800/600', title: 'Algorithm Dreams', description: 'Abstract compositions from evolutionary algorithms.' },
]

// ─── Image error fallback ───────────────────────────────────────────
const PLACEHOLDER_IMG = '/uploads/placeholder.svg'

// ─── Sanitize text ──────────────────────────────────────────────────
function sanitize(input: unknown, max = 200): string {
  if (typeof input !== 'string') return ''
  return input.slice(0, max).trim()
}

// ─── Component ──────────────────────────────────────────────────────
export function Gallery() {
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [galleryItems, setGalleryItems] = useState<Artwork[]>(FALLBACK_ARTWORKS)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const MotionDiv = motion.div as any

  // Fetch gallery items from local API
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch('/api/admin/gallery')
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.items) && data.items.length > 0) {
          const mapped: Artwork[] = data.items.map((item: any) => ({
            id: String(item.id),
            title: sanitize(item.title, 100),
            description: sanitize(item.description) || undefined,
            imagePath: item.imagePath || PLACEHOLDER_IMG,
            featured: Boolean(item.featured),
            aspectRatio: item.aspectRatio,
          }))
          setGalleryItems(mapped)
        }
      } catch (error) {
        console.error('Gallery: failed to fetch items:', error)
      }
    }
    fetchItems()
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
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 auto-rows-[180px]">
          {galleryItems.map((artwork) => {
            const imgSrc = imageErrors.has(artwork.id) ? PLACEHOLDER_IMG : artwork.imagePath
            return (
              <MotionDiv
                key={artwork.id}
                className={`relative cursor-pointer bg-neutral-900 overflow-hidden group ${artwork.featured ? 'col-span-2 row-span-2' : ''}`}
                onClick={() => setSelectedArtwork(artwork)}
                whileHover={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Image
                  src={imgSrc}
                  alt={artwork.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={() => handleImageError(artwork.id)}
                />
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
        {selectedArtwork && (
          <MotionDiv
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <MotionDiv
              className="relative max-w-5xl w-full h-full flex items-center justify-center p-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="relative w-full" style={{ height: '80vh' }}>
                <Image
                  src={imageErrors.has(selectedArtwork.id) ? PLACEHOLDER_IMG : selectedArtwork.imagePath}
                  alt={selectedArtwork.title}
                  fill
                  className="object-contain"
                  onError={() => handleImageError(selectedArtwork.id)}
                />
              </div>
              <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                <h3 className="text-white text-xl md:text-2xl font-light">{selectedArtwork.title}</h3>
                {selectedArtwork.description && (
                  <p className="text-gray-400 text-sm md:text-base mt-2 max-w-lg mx-auto">{selectedArtwork.description}</p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  )
}
