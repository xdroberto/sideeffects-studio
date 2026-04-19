'use client'

import Link from 'next/link'
import { Instagram, Github, Shield, Lock, Code } from 'lucide-react'

function CCIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 496 512" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M245.8 214.9l-33.2 17.3c-9.4-19.6-25.7-20-27.4-20-36.4 0-47.8 27.4-47.8 47.8 0 36.4 20.4 47.6 49.3 47.6 20.4 0 34.2-10 43.4-26.4l31.6 15.2c-6.8 13.6-29 38.4-76.6 38.4-56.8 0-92-33.2-92-75.2 0-45.2 38-77.8 92-77.8 46.6.2 68.2 22.2 61.7 33.1zm152 0l-33.2 17.3c-9.4-19.6-25.7-20-27.4-20-36.4 0-47.8 27.4-47.8 47.8 0 36.4 20.4 47.6 49.3 47.6 20.4 0 34.2-10 43.4-26.4l31.6 15.2c-6.8 13.6-29 38.4-76.6 38.4-56.8 0-92-33.2-92-75.2 0-45.2 38-77.8 92-77.8 46.6.2 68.2 22.2 61.7 33.1zM248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 449.6c-111.2 0-201.6-90.4-201.6-201.6S136.8 54.4 248 54.4 449.6 144.8 449.6 256 359.2 457.6 248 457.6z"/>
    </svg>
  )
}

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
              href="mailto:robertobecerrilhurtado@gmail.com"
              className="block hover:text-red-500 transition-colors"
            >
              robertobecerrilhurtado@gmail.com
            </a>
          </div>
          <div className="flex gap-4 text-gray-400">
            <a href="https://www.instagram.com/side_effects.art/" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors">
              <Instagram size={20} />
            </a>
            <a href="https://github.com/xdroberto" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition-colors">
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

      {/* Trust Badges */}
      <div className="relative z-10 max-w-6xl mx-auto mt-16 flex justify-center">
        <div className="flex items-center gap-8 text-gray-500">
          <a
            href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-gray-300 transition-colors group"
            title="Licensed under CC BY-NC-ND 4.0"
          >
            <CCIcon className="w-5 h-5" />
            <span className="text-xs tracking-wide">BY-NC-ND 4.0</span>
          </a>
          <div className="flex items-center gap-2 text-green-600/70" title="SSL Encrypted">
            <Lock size={16} />
            <span className="text-xs tracking-wide">HTTPS</span>
          </div>
          <a
            href="https://github.com/xdroberto/sideeffects-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-gray-300 transition-colors"
            title="Open Source"
          >
            <Code size={16} />
            <span className="text-xs tracking-wide">Open Source</span>
          </a>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/licensing" className="hover:text-white transition-colors">Licensing</Link>
          </div>
          <p>© 2026 side_effects.art<Link href="/admin" className="text-gray-800 hover:text-gray-600 transition-colors" aria-label="Admin">.</Link></p>
        </div>
      </div>
    </footer>
  )
}

