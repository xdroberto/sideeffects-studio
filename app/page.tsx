'use client'

import nextDynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Nav } from '@/components/nav'
import { ClientOnly } from '@/components/client-only'
import { Michroma as Microgramma, Space_Mono } from 'next/font/google'

const DiamondScene = nextDynamic(
  () => import('@/components/diamond-scene').then(mod => mod.DiamondScene),
  { ssr: false, loading: () => <div className="fixed inset-0 z-0 bg-black" /> }
)

const microgramma = Microgramma({ subsets: ['latin'], weight: ['400'] })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400'] })

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <Suspense fallback={<div className="fixed inset-0 z-0 bg-black" />}>
        <DiamondScene />
      </Suspense>
      <div className="relative z-10">
        <ClientOnly>
          <Nav />
        </ClientOnly>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-light tracking-wider mt-auto text-center text-white ${microgramma.className}`}>
            side_effects.art
          </h1>
          <p className={`mt-4 text-lg sm:text-xl md:text-2xl text-white ${spaceMono.className} mix-blend-difference opacity-70`}>
            elevating visual experiences
          </p>
          <div className="mt-auto p-8 text-gray-400 text-sm text-center">
            Generative Art • Interactive Design • Visual Symphony
          </div>
        </div>
      </div>
    </main>
  )
}
