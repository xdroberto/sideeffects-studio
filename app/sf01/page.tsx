import type { Metadata } from 'next'
import { SF01Client } from './sf01-client'

export const metadata: Metadata = {
  title: 'sf-01',
  description:
    'A live visual synthesizer for performers, designers and image-makers. Mix two GLSL shader decks like a DJ. Coming Q3 2026.',
}

export default function SF01Page() {
  return <SF01Client />
}
