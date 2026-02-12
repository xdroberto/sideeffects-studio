'use client'

import { useState } from 'react'
import * as Tone from 'tone'
import { Nav } from '../components/nav'
import { SynthControls } from './components/synth-controls'

export default function SF01() {
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null)

  const handleSynthChange = (newSynth: Tone.PolySynth) => {
    setSynth(prev => {
      if (prev) {
        prev.dispose()
      }
      return newSynth
    })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav onGalleryClick={() => {}} onAboutClick={() => {}} />
      <main className="container mx-auto px-4 py-12">
        <SynthControls onSynthChange={handleSynthChange} />
      </main>
    </div>
  )
}

