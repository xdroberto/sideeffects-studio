'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-24 max-w-3xl mx-auto">
      <Link href="/" className="text-gray-500 hover:text-white transition-colors text-sm mb-12 block">
        ← Back
      </Link>

      <h1 className="text-4xl font-light tracking-wider mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-12">Last updated: March 2026</p>

      <div className="space-y-8 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">Data Collection</h2>
          <p>
            This site does not collect, store, or process personal data. There are no cookies,
            tracking pixels, analytics scripts, or user accounts. All rendering happens
            client-side in your browser.
          </p>
        </section>

        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">Third-Party Services</h2>
          <p>
            This site may embed content from third-party services (e.g., Spotify). These services
            have their own privacy policies, and their embeds may collect data independently. We
            encourage you to review their respective privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">Hosting</h2>
          <p>
            This site is hosted on a private server. Standard server logs (IP addresses, request
            timestamps, user agents) may be recorded automatically by the web server for
            security and operational purposes. These logs are not shared with third parties
            and are periodically purged.
          </p>
        </section>

        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">External Links</h2>
          <p>
            This site may contain links to external websites. We are not responsible for the
            privacy practices or content of those sites.
          </p>
        </section>

        <section>
          <h2 className="text-white text-lg font-light tracking-wider mb-3">Contact</h2>
          <p>
            For privacy-related inquiries, contact{' '}
            <a href="mailto:robertobecerrilhurtado@gmail.com" className="text-red-500 hover:text-red-400 transition-colors">
              robertobecerrilhurtado@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
