'use client'

import { Nav } from '@/components/nav'
import { ClientOnly } from '@/components/client-only'
import { SynthControls } from './components/synth-controls'

export default function ChordLab() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav onGalleryClick={() => { }} onAboutClick={() => { }} />
      <main className="container mx-auto px-4 py-12">
        <ClientOnly>
          <SynthControls />
        </ClientOnly>
      </main>
    </div>
  )
}

