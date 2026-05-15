import type { Metadata } from 'next'
import { PrivacyClient } from './privacy-client'

export const metadata: Metadata = {
  title: 'privacy',
  description: 'Privacy policy for side_effects.art.',
}

export default function PrivacyPage() {
  return <PrivacyClient />
}
