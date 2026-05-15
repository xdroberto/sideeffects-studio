'use client'

import Link from 'next/link'
import { Container } from '@/components/ui/container'

export function LicensingClient() {
  return (
    <Container id="main-content" width="prose" as="main" className="min-h-screen bg-canvas text-white py-24 md:py-32">
      <Link href="/" className="text-ink-subtle hover:text-white transition-colors text-sm mb-12 block">
        ← Back
      </Link>

      <h1 className="text-display-md mb-2">Licensing</h1>
      <p className="text-ink-subtle text-sm mb-12">Last updated: March 2026</p>

      <div className="space-y-8 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-display-sm text-white mb-3">Creative Commons</h2>
          <p>
            All original generative artworks, visual designs, animations, and creative content
            published on this site are licensed under{' '}
            <a
              href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal hover:text-signal-hover transition-colors"
            >
              Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)
            </a>.
          </p>
          <p className="mt-3">This means you are free to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-ink-muted">
            <li><strong className="text-gray-300">Share</strong> — copy and redistribute the material in any medium or format</li>
          </ul>
          <p className="mt-3">Under the following conditions:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-ink-muted">
            <li><strong className="text-gray-300">Attribution</strong> — You must give appropriate credit to Roberto Becerril Hurtado / side_effects.art</li>
            <li><strong className="text-gray-300">NonCommercial</strong> — You may not use the material for commercial purposes</li>
            <li><strong className="text-gray-300">NoDerivatives</strong> — You may not remix, transform, or build upon the material</li>
          </ul>
        </section>

        <section>
          <h2 className="text-display-sm text-white mb-3">Commissioned Works</h2>
          <p>
            Custom pieces, installations, and works created under commission are &copy; Roberto
            Becerril Hurtado. All rights reserved. These works are not covered by the CC license
            above — usage terms are defined in the individual commission agreement.
          </p>
        </section>

        <section>
          <h2 className="text-display-sm text-white mb-3">Commissioning &amp; Collaboration</h2>
          <p>
            Custom pieces, installations, and collaborative works are available for licensing.
            Terms are negotiated on a per-project basis. Licensing may include but is not
            limited to:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-ink-muted">
            <li>Personal display and collection</li>
            <li>Commercial use in branding, events, or media</li>
            <li>Exclusive or non-exclusive reproduction rights</li>
            <li>Limited edition digital or physical prints</li>
          </ul>
        </section>

        <section>
          <h2 className="text-display-sm text-white mb-3">Open Source Components</h2>
          <p>
            Portions of this site use open-source libraries (React, Three.js, Next.js, etc.)
            distributed under their respective licenses (MIT, Apache 2.0, etc.). These licenses
            apply exclusively to those components and do not extend to the original creative
            works displayed on this site.
          </p>
        </section>

        <section>
          <h2 className="text-display-sm text-white mb-3">Third-Party Assets</h2>
          <p>
            The &quot;philosopher bust&quot; icon used in the playground page is by Delapouite
            via{' '}
            <a
              href="https://game-icons.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal hover:text-signal-hover transition-colors"
            >
              game-icons.net
            </a>
            , licensed under{' '}
            <a
              href="https://creativecommons.org/licenses/by/3.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal hover:text-signal-hover transition-colors"
            >
              CC BY 3.0
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-display-sm text-white mb-3">Prohibited Uses</h2>
          <p>
            Without explicit written permission, you may not:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-ink-muted">
            <li>Reproduce, mint, or tokenize any artwork as an NFT or digital asset</li>
            <li>Use any artwork to train machine learning models</li>
            <li>Redistribute modified or unmodified versions of the works</li>
            <li>Claim authorship of any original content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-display-sm text-white mb-3">Inquiries</h2>
          <p>
            For licensing requests or questions, contact{' '}
            <a href="mailto:robertobecerrilhurtado@gmail.com" className="text-signal hover:text-signal-hover transition-colors">
              robertobecerrilhurtado@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </Container>
  )
}
