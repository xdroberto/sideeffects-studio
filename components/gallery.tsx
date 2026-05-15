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

// ─── YouTube hover preview ──────────────────────────────────────────
// YouTube expone 3 frame-stills por video en /vi/{id}/1.jpg, 2.jpg,
// 3.jpg (quartiles). Si ciclamos entre ellos al hover, conseguimos un
// flipbook ligero — feel "video preview" sin cargar el iframe entero.
// Solo desktop (hover); mobile keeps the static maxres.
const YT_PREVIEW_FRAMES = [1, 2, 3] as const
const YT_PREVIEW_INTERVAL_MS = 600

function getYouTubePreviewFrame(youtubeId: string, frameIdx: number): string {
  const safe = YT_PREVIEW_FRAMES[frameIdx % YT_PREVIEW_FRAMES.length] ?? 1
  return `https://img.youtube.com/vi/${youtubeId}/${safe}.jpg`
}

// ─── Component ──────────────────────────────────────────────────────
// Map the committed JSON at module-eval time so the initial render is correct
// (no flash of fallback content in static export).
const INITIAL_ARTWORKS: Artwork[] = ((galleryData as { items?: unknown[] }).items ?? [])
  .map(normalizeItem)
  .filter((it): it is Artwork => it !== null)

export function Gallery() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [galleryItems, setGalleryItems] = useState<Artwork[]>(INITIAL_ARTWORKS)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  // Refs para focus trap del lightbox:
  // - dialogRef apunta al modal para query de focusables
  // - previousFocusRef guarda el elemento que tenía focus antes de abrir
  // - closeButtonRef es el primer focusable al abrir (close icon)
  // - wasClosedRef rastrea si el dialog estaba cerrado, para diferenciar
  //   "abrir" (mover foco al close) vs "navegar entre obras" (no mover).
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const wasClosedRef = useRef(true)

  // Derive the current artwork from index. Index-based state allows
  // prev/next navigation within the lightbox without recomputing position.
  const selectedArtwork = selectedIndex !== null ? galleryItems[selectedIndex] ?? null : null
  const totalItems = galleryItems.length

  // ─── YouTube hover preview state ─────────────────────────────────
  // Cuando el user hover sobre un tile video-youtube, ciclamos entre
  // los 3 frame stills que YouTube expone (poor-man's video preview).
  // Solo desktop — mobile no tiene hover real (tap abre el lightbox).
  const [hoveredYouTubeId, setHoveredYouTubeId] = useState<string | null>(null)
  const [hoverFrame, setHoverFrame] = useState(0)

  useEffect(() => {
    if (!hoveredYouTubeId) {
      setHoverFrame(0)
      return
    }
    // Preload los 3 frames así el cycle se ve instant (no network flash).
    YT_PREVIEW_FRAMES.forEach(f => {
      const img = new window.Image()
      img.src = `https://img.youtube.com/vi/${hoveredYouTubeId}/${f}.jpg`
    })
    const tick = window.setInterval(() => {
      setHoverFrame(f => f + 1)
    }, YT_PREVIEW_INTERVAL_MS)
    return () => window.clearInterval(tick)
  }, [hoveredYouTubeId])

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

  const openArtwork = useCallback((index: number) => {
    // Guardar el elemento con focus antes de abrir el lightbox para
    // poder devolvérselo al cerrar (WCAG 2.4.3 Focus Order).
    previousFocusRef.current = document.activeElement as HTMLElement | null
    setSelectedIndex(index)
  }, [])

  const closeModal = useCallback(() => setSelectedIndex(null), [])

  // Navegación cíclica entre obras dentro del lightbox. Si está cerrado
  // (selectedIndex === null), el setter no-op. Wrap-around: en la primera
  // obra, prev va a la última; en la última, next va a la primera.
  const goToPrev = useCallback(() => {
    setSelectedIndex(curr => {
      if (curr === null) return null
      const n = galleryItems.length
      if (n <= 0) return curr
      return (curr - 1 + n) % n
    })
  }, [galleryItems.length])

  const goToNext = useCallback(() => {
    setSelectedIndex(curr => {
      if (curr === null) return null
      const n = galleryItems.length
      if (n <= 0) return curr
      return (curr + 1) % n
    })
  }, [galleryItems.length])

  // Focus management:
  // - Al ABRIR (closed → open): mover foco al close button.
  // - Al NAVEGAR (open → open con otro index): NO mover foco. Si el user
  //   está usando ← → con foco en uno de los nav buttons, queremos que
  //   quede ahí para que pueda seguir presionando.
  // - Al CERRAR (open → closed): devolver foco al tile que lo abrió.
  useEffect(() => {
    if (selectedIndex !== null) {
      if (wasClosedRef.current) {
        wasClosedRef.current = false
        // Demorar un tick para que el modal esté montado.
        const t = setTimeout(() => closeButtonRef.current?.focus(), 0)
        return () => clearTimeout(t)
      }
    } else {
      wasClosedRef.current = true
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
        previousFocusRef.current = null
      }
    }
  }, [selectedIndex])

  // Close modal on Escape + focus trap con Tab/Shift+Tab + nav con ← →.
  useEffect(() => {
    if (selectedIndex === null) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrev()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goToNext()
        return
      }
      if (e.key !== 'Tab') return
      // Focus trap: mantener el foco dentro del dialog.
      const root = dialogRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"]), iframe, video[controls]'
      )
      const list = Array.from(focusables).filter(el => {
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
      if (list.length === 0) return
      const first = list[0]!
      const last = list[list.length - 1]!
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeModal, goToPrev, goToNext, selectedIndex])

  if (galleryItems.length === 0) {
    return (
      <div className="w-full bg-canvas py-24 text-center">
        <p className="text-ink-subtle text-lg">No artworks yet.</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-canvas" ref={containerRef}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 auto-rows-[180px] sm:auto-rows-[180px] grid-flow-dense">
          {galleryItems.map((artwork, index) => {
            const isVideo = artwork.mediaType !== 'image'
            const errored = imageErrors.has(artwork.id)
            const rawThumb = getTileThumb(artwork)
            // Si es YouTube y está hovered, swap src al frame del cycle
            // — flipbook ligero, sin cargar iframe ni nuevos uploads.
            // Check inline en lugar de derivar boolean para que TS
            // narrowee la union al variant video-youtube.
            const previewSrc =
              artwork.mediaType === 'video-youtube' &&
              hoveredYouTubeId === artwork.youtubeId
                ? getYouTubePreviewFrame(artwork.youtubeId, hoverFrame)
                : null
            const tileSrc = errored ? PLACEHOLDER_IMG : (previewSrc ?? rawThumb)
            const isRemoteThumb = tileSrc.startsWith('http')
            const variantBadge =
              artwork.mediaType === 'video-mp4' ? 'VIDEO'
                : artwork.mediaType === 'video-youtube' ? 'YOUTUBE'
                  : null

            // Tile sizing por aspectRatio:
            // - featured: 2x2 (override más fuerte)
            // - portrait / square: row-span-2 SOLO desde sm: en mobile
            //   el grid es solo 2 cols y mezclar row-spans crea huecos
            //   feos. En mobile dejamos todos los items a 1x1 (excepto
            //   featured) y el `grid-flow-dense` del contenedor rellena
            //   sin reordenar visualmente. En sm+ ya hay 4 cols y la
            //   verticalidad de portrait/square se siente intencional.
            // - landscape (default): 1x1 (las imágenes wide caben bien)
            const tileSizeClass = artwork.featured
              ? 'col-span-2 row-span-2'
              : artwork.aspectRatio === 'portrait' || artwork.aspectRatio === 'square'
                ? 'sm:row-span-2'
                : ''

            return (
              <MotionDiv
                key={artwork.id}
                className={`relative cursor-pointer bg-canvas-raised overflow-hidden rounded-[20px] group transition-shadow duration-300 ease-out hover:shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_8px_30px_-12px_rgba(239,68,68,0.35)] focus-visible:shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_8px_30px_-12px_rgba(239,68,68,0.35)] ${tileSizeClass}`}
                onClick={() => openArtwork(index)}
                onKeyDown={(e: ReactKeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openArtwork(index)
                  }
                }}
                onMouseEnter={() => {
                  if (artwork.mediaType === 'video-youtube') {
                    setHoveredYouTubeId(artwork.youtubeId)
                  }
                }}
                onMouseLeave={() => {
                  if (artwork.mediaType === 'video-youtube') {
                    setHoveredYouTubeId(prev =>
                      prev === artwork.youtubeId ? null : prev,
                    )
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
                      <p className="text-ink-muted text-xs md:text-sm mt-1 line-clamp-2">{artwork.description}</p>
                    )}
                  </div>
                </div>
              </MotionDiv>
            )
          })}
        </div>
      </div>

      {/* Lightbox — dialog modal con focus trap. Tab queda atrapado entre
          el close button y los controles internos (video / iframe). */}
      <AnimatePresence>
        {selectedArtwork && (() => {
          const item = selectedArtwork
          const errored = imageErrors.has(item.id)
          const titleId = `gallery-lightbox-title-${item.id}`

          return (
            <MotionDiv
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <MotionDiv
                ref={dialogRef}
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
                    // Self-hosted video — autoplay+muted+loop porque los
                    // clips del portfolio son loops cortos sin sonido.
                    // `muted` es requirement de browsers modernos para
                    // permitir autoplay. `playsInline` evita fullscreen
                    // forzado en iOS Safari. Sin `controls`: para loops
                    // contemplativos los controles distraen y no aportan
                    // (no hay seek meaningful en 12s de loop sin audio).
                    <video
                      src={item.videoPath}
                      playsInline
                      autoPlay
                      loop
                      muted
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
                  <h3 id={titleId} className="text-white text-xl md:text-2xl font-light">{item.title}</h3>
                  {item.description && (
                    <p className="text-ink-muted text-sm md:text-base mt-2 max-w-lg mx-auto">{item.description}</p>
                  )}
                </div>

                {/* Close button — primer focusable al abrir; ref para
                    poder devolverle el foco al montar el dialog. */}
                <button
                  ref={closeButtonRef}
                  onClick={closeModal}
                  className="absolute top-4 right-4 text-white hover:text-signal transition-colors duration-200 ease-out z-10"
                  aria-label="Close lightbox"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>

                {/* Prev / next nav + indicador. Solo cuando hay más de
                    una obra. Wrap-around: en la primera, prev → última;
                    en la última, next → primera. Las teclas ← → hacen
                    lo mismo desde cualquier elemento del dialog. */}
                {totalItems > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goToPrev}
                      aria-label="Previous artwork"
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:text-signal focus-visible:text-signal transition-colors duration-200 ease-out z-10 p-3 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={goToNext}
                      aria-label="Next artwork"
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:text-signal focus-visible:text-signal transition-colors duration-200 ease-out z-10 p-3 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>

                    {/* Indicador n/N — aria-live anuncia el cambio al
                        navegar con teclado. */}
                    <p
                      aria-live="polite"
                      aria-atomic="true"
                      className="absolute top-4 left-4 text-caption-mono-xs uppercase text-white font-mono z-10 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded tabular-nums tracking-wider"
                    >
                      <span>{(selectedIndex ?? 0) + 1}</span>
                      <span aria-hidden className="text-white/40 px-0.5">/</span>
                      <span>{totalItems}</span>
                    </p>
                  </>
                )}
              </MotionDiv>
            </MotionDiv>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
