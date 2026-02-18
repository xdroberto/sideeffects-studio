'use client'

import Link from 'next/link'
import { Instagram, Twitter, Github } from 'lucide-react'

export function Footer() {
  return (
    <footer id="about" className="relative min-h-screen bg-black text-white pt-32 pb-8 px-4">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80")',
          backgroundBlendMode: 'overlay'
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-light tracking-wider">CONNECT</h3>
          <div className="space-y-2 text-gray-400">
            <p>México</p>
            <a
              href="mailto:hello@side-effects.art"
              className="block hover:text-red-500 transition-colors"
            >
              hello@side-effects.art
            </a>
          </div>
          <div className="flex gap-4 text-gray-400">
            <a href="https://www.instagram.com/tu_usuario_de_instagram" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors">
              <Instagram size={20} />
            </a>
            <a href="#" className="hover:text-red-500 transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="hover:text-red-500 transition-colors">
              <Github size={20} />
            </a>
          </div>
        </div>

        <div className="text-center space-y-6">
          <h2 className="text-3xl font-light tracking-wider">side_effects.art</h2>
          <p className="text-gray-400 max-w-sm mx-auto">
            Exploring the intersection of code/art/creativity through generative art and interactive experiences.
          </p>
          <div className="pt-8">
            <iframe
              src="https://open.spotify.com/embed/playlist/3e0xEfFFVAX3v6cq7MuU5I?utm_source=generator&theme=0"
              width="100%"
              height="152"
              frameBorder="0"
              allow="encrypted-media"
              className="rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-light tracking-wider">AVAILABILITY</h3>
          <div className="space-y-2 text-gray-400">
            <div className="flex justify-between">
              <span>Commissions</span>
              <span>Open</span>
            </div>
            <div className="flex justify-between">
              <span>Collaborations</span>
              <span>Open</span>
            </div>

          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto mt-24 pt-8 border-t border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/licensing" className="hover:text-white transition-colors">Licensing</Link>
          </div>
          <p>© 2024 side_effects.art. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

