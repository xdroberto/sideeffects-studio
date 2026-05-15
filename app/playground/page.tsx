import type { Metadata } from 'next'
import { PlaygroundClient } from './playground-client'

export const metadata: Metadata = {
  title: 'playground',
  description:
    'Drag the proposition. The argument rearranges around it in real time. A pretext reflow demo.',
}

export default function PlaygroundPage() {
  return <PlaygroundClient />
}
