'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface Artwork {
  id: number
  src: string
  title: string
  featured?: boolean
  aspectRatio?: string
}

const artworks: Artwork[] = [
  { 
    id: 1, 
    src: "https://images.unsplash.com/photo-1637417494464-e40e94c93c2f",
    title: "Digital Waves", 
    featured: true,
    aspectRatio: "aspect-[3/2]"
  },
  { 
    id: 2, 
    src: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4",
    title: "Fractal Dimensions" 
  },
  { 
    id: 3, 
    src: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e",
    title: "Neural Patterns" 
  },
  { 
    id: 4, 
    src: "https://images.unsplash.com/photo-1633545499432-937d8c342c7a",
    title: "Quantum Flow" 
  },
  { 
    id: 5, 
    src: "https://images.unsplash.com/photo-1633545500006-c856a1b6c698",
    title: "Digital Nebula" 
  },
  { 
    id: 6, 
    src: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e",
    title: "Algorithm Dreams" 
  },
  { 
    id: 7, 
    src: "https://images.unsplash.com/photo-1633545483661-bd3f9e52ea36",
    title: "Synthetic Nature" 
  },
  { 
    id: 8, 
    src: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4",
    title: "Binary Cosmos" 
  }
]

export function Gallery() {
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleArtworkClick = (artwork: Artwork) => {
    setSelectedArtwork(artwork)
  }

  const closeModal = () => {
    setSelectedArtwork(null)
  }

  return (
    <div className="w-full bg-black" ref={containerRef}>
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 auto-rows-[180px]">
          {artworks.map((artwork) => (
            <motion.div
              key={artwork.id}
              className={`relative cursor-pointer bg-neutral-900 overflow-hidden
                ${artwork.featured ? 'col-span-2 row-span-2' : ''}
                group
              `}
              onClick={() => handleArtworkClick(artwork)}
              whileHover={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Image
                src={artwork.src}
                alt={artwork.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-sm md:text-base">{artwork.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedArtwork && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="relative max-w-5xl w-full h-full flex items-center justify-center p-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full" style={{ height: '80vh' }}>
                <Image
                  src={selectedArtwork.src}
                  alt={selectedArtwork.title}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="absolute bottom-8 left-0 right-0 text-center">
                <h3 className="text-white text-xl md:text-2xl font-light">
                  {selectedArtwork.title}
                </h3>
              </div>
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

