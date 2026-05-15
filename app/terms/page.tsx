import type { Metadata } from 'next'
import { TermsClient } from './terms-client'

export const metadata: Metadata = {
  title: 'terms',
  description:
    'Terms of use for side_effects.art and its artwork (CC BY-NC-ND 4.0).',
}

export default function TermsPage() {
  return <TermsClient />
}
