import type { Metadata } from 'next'
import { ChordLabClient } from './chord-lab-client'

export const metadata: Metadata = {
  title: 'chord lab',
  description:
    'A pocket-sized chord toy for non-pianists. Tap a pad, get a real chord. Coming early 2027.',
}

export default function ChordLabPage() {
  return <ChordLabClient />
}
