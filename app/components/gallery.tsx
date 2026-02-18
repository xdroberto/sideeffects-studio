'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface Artwork {
  id: number | string
  src: string
  title: string
  featured?: boolean
  aspectRatio?: string
}

const artworks: Artwork[] = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
    title: "Digital Waves",
    featured: true,
    aspectRatio: "aspect-[3/2]"
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
    title: "Fractal Dimensions"
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80",
    title: "Neural Patterns"
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    title: "Quantum Flow"
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80",
    title: "Digital Nebula"
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80",
    title: "Algorithm Dreams"
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1614851099511-773084f6911d?w=800&q=80",
    title: "Synthetic Nature"
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800&q=80",
    title: "Binary Cosmos"
  }
]

import { client } from '@/lib/sanity'
import imageUrlBuilder from '@sanity/image-url'

let builder: any = null
try {
  builder = imageUrlBuilder(client)
} catch (e) {
  // Sanity not configured
}

function urlFor(source: any) {
  return builder?.image(source)
}

export function Gallery() {
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [galleryItems, setGalleryItems] = useState<Artwork[]>(artworks)
  const containerRef = useRef<HTMLDivElement>(null)

  const MotionDiv = motion.div as any

  useEffect(() => {
    const fetchProjects = async () => {
      const pid = client.config().projectId
      if (!pid || pid === 'placeholder') return

      try {
        const query = `*[_type == "project"]{
          _id,
          title,
          mainImage,
          aspectRatio,
          featured
        }`
        const projects = await client.fetch(query)

        if (projects && projects.length > 0) {
          const mappedProjects = projects.map((p: any) => ({
            id: p._id,
            title: p.title,
            src: p.mainImage ? urlFor(p.mainImage).width(800).url() : '',
            aspectRatio: p.aspectRatio,
            featured: p.featured
          }))
          setGalleryItems(mappedProjects)
        }
      } catch (error) {
        console.error("Failed to fetch Sanity projects:", error)
      }
    }

    fetchProjects()
  }, [])


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
          {galleryItems.map((artwork) => (
            <MotionDiv
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
            </MotionDiv>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedArtwork && (
          <MotionDiv
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
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
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  )
}

