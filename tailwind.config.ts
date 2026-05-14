import type { Config } from 'tailwindcss'

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /**
       * Design tokens — side_effects.art
       *
       * Filosofía: paleta limpia (negro / blanco / acento rojo) con
       * jerarquía tipográfica explícita basada en Michroma (display) y
       * Space Mono (caption / utility). La display font (Michroma) sale
       * de la familia Microgramma extended industrial — encaja con la
       * estética técnica/musical del proyecto. Space Mono provee la
       * personalidad de "label / readout / firmware UI" usada en SF-01
       * y Chord Lab.
       *
       * Los tokens semánticos (canvas / ink / accent / line) coexisten
       * con los tokens shadcn HSL ya existentes. Son aditivos, no
       * destructivos — `text-gray-400` sigue siendo válido.
       */
      colors: {
        // Semantic surface tokens — side_effects.art identity.
        // No reemplazan los tokens shadcn (accent/primary/etc); coexisten.
        canvas: {
          DEFAULT: '#000000',
          muted: '#0a0a0a',
          raised: '#141414',
        },
        ink: {
          DEFAULT: '#ffffff',
          muted: '#a1a1aa', // ≈ Tailwind zinc-400, paridad con text-gray-400
          subtle: '#71717a', // ≈ zinc-500
          faint: '#52525b', // ≈ zinc-600
        },
        // signal: el rojo del proyecto. Lo separamos de shadcn `accent`
        // (que es el token gris claro de los UI primitives) para no romper
        // los componentes existentes.
        signal: {
          DEFAULT: '#ef4444', // paridad con red-500
          hover: '#dc2626', // red-600
          glow: 'rgba(239, 68, 68, 0.2)',
        },
        line: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.16)',
          subtle: 'rgba(255, 255, 255, 0.04)',
        },
        // shadcn / radix tokens
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      /**
       * Type scale — fluid clamp() values donde tiene sentido (hero / section).
       * - display-xl: hero H1 (landing / sf-01 / chord-lab heroes)
       * - display-lg: sección H2 grande (sf-01 features title)
       * - display-md: H1 utility de páginas legales
       * - display-sm: H2 utility (legal pages, footer)
       * - caption-mono / -sm / -xs: las micro-labels uppercase mono que
       *   aparecen por toda la UI (SF-01 controls, Chord Lab display, etc.)
       */
      fontSize: {
        'display-xl': [
          'clamp(1.75rem, 9vw, 4.5rem)',
          { lineHeight: '1.05', letterSpacing: '0.05em', fontWeight: '300' },
        ],
        'display-lg': [
          'clamp(1.75rem, 5vw, 3rem)',
          { lineHeight: '1.1', letterSpacing: '0.05em', fontWeight: '300' },
        ],
        'display-md': [
          'clamp(1.5rem, 4vw, 2.25rem)',
          { lineHeight: '1.15', letterSpacing: '0.05em', fontWeight: '300' },
        ],
        'display-sm': [
          '1.125rem',
          { lineHeight: '1.35', letterSpacing: '0.05em', fontWeight: '300' },
        ],
        // Mono captions usadas para labels uppercase (SF-01 / Chord Lab)
        'caption-mono': [
          '0.6875rem',
          { lineHeight: '1.4', letterSpacing: '0.22em' },
        ],
        'caption-mono-sm': [
          '0.625rem',
          { lineHeight: '1.4', letterSpacing: '0.18em' },
        ],
        'caption-mono-xs': [
          '0.5625rem',
          { lineHeight: '1.4', letterSpacing: '0.2em' },
        ],
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config