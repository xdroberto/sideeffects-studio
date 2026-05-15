import type { Metadata } from 'next'
import { LicensingClient } from './licensing-client'

export const metadata: Metadata = {
  title: 'licensing',
  description:
    'Licensing details: what you can and cannot do with side_effects.art artwork.',
}

export default function LicensingPage() {
  return <LicensingClient />
}
