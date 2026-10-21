import type { Metadata } from 'next'
import { SF01Client } from './sf01-client'

export const metadata: Metadata = {
  title: 'sf-01',
  description:
    'A live visual synthesizer for performers, designers, and artists. Mix two GLSL shader decks like a DJ. In development.',
}

export default function SF01Page() {
  return <SF01Client />
}
