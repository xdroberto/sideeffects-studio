import './globals.css'
import type { Metadata } from 'next'
import { Inter, Michroma, Space_Mono } from 'next/font/google'

/**
 * Font system — side_effects.art
 *
 * - Inter (var --font-sans): body text default, fallback global.
 * - Michroma (var --font-display): display font para H1/H2 heroes.
 *   Geometría extended industrial — encaja con la estética
 *   técnica/musical (sintetizadores, synth-art).
 * - Space Mono (var --font-mono): caption / readout / labels.
 *   Personalidad de "firmware UI" usada en SF-01 y Chord Lab.
 *
 * Cargamos las tres aquí con `variable` CSS para que cada página
 * pueda usarlas vía Tailwind (`font-display`, `font-mono`) o el
 * className expuesto por `next/font` — sin re-imports por página
 * (cada import duplicado generaba una carga extra de la font).
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const michroma = Michroma({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://sideeffects.robertobh.dev'),
  title: {
    default: 'side_effects.art',
    template: '%s · side_effects.art',
  },
  description:
    'Generative audio-visual art and tools by Roberto Becerril. Live shader synth, chord exploration toy, Pretext reflow demos.',
  applicationName: 'side_effects.art',
  authors: [{ name: 'Roberto Becerril', url: 'https://robertobh.dev' }],
  creator: 'Roberto Becerril',
  publisher: 'side_effects.art',
  keywords: [
    'generative art',
    'audio-visual',
    'shader',
    'GLSL',
    'pretext',
    'reflow',
    'chord exploration',
    'creative coding',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sideeffects.robertobh.dev',
    siteName: 'side_effects.art',
    title: 'side_effects.art',
    description:
      'Generative audio-visual art and tools by Roberto Becerril.',
    images: [
      {
        url: '/uploads/branching-diffusion-poster.jpg',
        width: 1280,
        height: 720,
        alt: 'side_effects.art — generative work',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'side_effects.art',
    description:
      'Generative audio-visual art and tools by Roberto Becerril.',
    images: ['/uploads/branching-diffusion-poster.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${michroma.variable} ${spaceMono.variable}`}
    >
      <body className={inter.className}>
        {/*
          Skip-link a11y — visible solo cuando recibe foco con teclado.
          Permite a usuarios de keyboard saltarse la navegación principal
          y aterrizar en el `<main>` de la página actual. Cada page del
          portfolio usa `<main>` (privacy/terms/licensing vía Container
          as="main"; landing/sf01/chord-lab/playground/404/error usan
          `<main>` directo). El target `#main-content` se resuelve al
          primer `<main>` que tenga ese id; las pages ya marcan su main
          con id="main-content" donde aplica.
        */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-canvas focus:text-signal focus:border focus:border-signal focus:font-mono focus:text-caption-mono focus:uppercase focus:tracking-wider"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  )
}

