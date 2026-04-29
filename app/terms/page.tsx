'use client'

import Link from 'next/link'
import { JustifiedProse } from '@/components/justified-prose'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-24 max-w-3xl mx-auto">
      <Link href="/" className="text-gray-500 hover:text-white transition-colors text-sm mb-12 block">
        ← Back
      </Link>

      <h1 className="text-4xl font-light tracking-wider mb-2">Terms of Use</h1>
      <p className="text-gray-500 text-sm mb-12">Last updated: March 2026</p>

      <div className="space-y-8 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">1. Acceptance</h2>
          <JustifiedProse>
            By accessing this website (sideeffects.robertobh.dev), you agree to these terms. side_effects.art is an independent creative project operated by Roberto Becerril Hurtado. It is not a registered trademark or incorporated entity at this time.
          </JustifiedProse>
        </section>

        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">2. Intellectual Property</h2>
          <JustifiedProse>
            All original content on this site — including but not limited to generative artworks, code, visual designs, animations, and audiovisual compositions — is the intellectual property of Roberto Becerril Hurtado and is protected under applicable copyright laws.
          </JustifiedProse>
        </section>

        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">3. Use of Content</h2>
          <JustifiedProse>
            Original creative works published on this site are licensed under{' '}
            <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 transition-colors">
              CC BY-NC-ND 4.0
            </a>
            . You may share and redistribute the material for non-commercial purposes, with appropriate credit, and without modification. For any use beyond this license — including commercial use, derivatives, or commissioned work — prior written permission is required. See the{' '}
            <Link href="/licensing" className="text-red-500 hover:text-red-400 transition-colors">
              Licensing
            </Link>{' '}
            page for details.
          </JustifiedProse>
        </section>

        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">4. Third-Party Content</h2>
          <JustifiedProse>
            This site may include third-party libraries, fonts, or assets used under their respective licenses. These remain the property of their original authors.
          </JustifiedProse>
        </section>

        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">5. Disclaimer</h2>
          <JustifiedProse>
            This site is provided &ldquo;as is&rdquo; without warranties of any kind. The creator is not liable for any damages arising from your use of this site, including but not limited to hardware or software issues related to WebGL rendering.
          </JustifiedProse>
        </section>

        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">6. Changes</h2>
          <JustifiedProse>
            These terms may be updated at any time. Continued use of the site constitutes acceptance of the revised terms.
          </JustifiedProse>
        </section>

        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">7. Contact</h2>
          <p className="text-gray-300 leading-relaxed">
            For questions regarding these terms, contact{' '}
            <a href="mailto:robertobecerrilhurtado@gmail.com" className="text-red-500 hover:text-red-400 transition-colors">
              robertobecerrilhurtado@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
