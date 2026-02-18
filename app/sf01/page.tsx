'use client'

import { useState } from 'react'
import * as Tone from 'tone'
import { Nav } from '../components/nav'
import { SynthControls } from './components/synth-controls'

export default function SF01() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav onGalleryClick={() => { }} onAboutClick={() => { }} />
      <main className="container mx-auto px-4 py-12">
        <SynthControls />
      </main>
    </div>
  )
}

