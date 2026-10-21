import type { Metadata } from 'next'
import { PlaygroundClient } from './playground-client'

export const metadata: Metadata = {
  title: 'playground',
  description: "Four instruments built from the studio's materials: ink, text, strings and thread.",
}

export default function PlaygroundPage() {
  return <PlaygroundClient />
}
