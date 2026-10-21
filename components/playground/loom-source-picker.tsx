'use client'

import { useRef, useState, type RefObject } from 'react'
import type { LoomHandle } from './loom'

const SEG = 'rounded-md px-3 py-2 font-mono text-caption-mono-sm uppercase tracking-wider transition-colors duration-150 ease-out'

/**
 * Qué tejer: «Socrates» o «Your photo». Elegir el mismo otra vez vuelve a
 * empezar; la foto se lee en el navegador y no se sube a ningún lado.
 */
export function LoomSourcePicker({ loom, className = '' }: { loom: RefObject<LoomHandle>; className?: string }) {
  const [current, setCurrent] = useState<'socrates' | 'photo'>('socrates')
  const file = useRef<HTMLInputElement>(null)
  const seg = (active: boolean) => `${SEG} ${active ? 'bg-signal text-black' : 'bg-transparent text-ink-muted hover:bg-canvas/40 hover:text-signal'}`

  return (
    <div className={`space-y-2 ${className}`}>
      <div role="group" aria-label="What to weave" className="inline-flex gap-1 rounded-lg border border-line-strong p-1">
        <button
          type="button"
          aria-pressed={current === 'socrates'}
          onClick={() => {
            if (current === 'socrates') loom.current?.restart()
            else loom.current?.weave('socrates')
            setCurrent('socrates')
          }}
          className={seg(current === 'socrates')}
        >
          Socrates
        </button>
        <button type="button" aria-pressed={current === 'photo'} onClick={() => file.current?.click()} className={seg(current === 'photo')}>
          Your photo
        </button>
      </div>
      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          setCurrent('photo')
          loom.current?.weave(f)
        }}
      />
      <p className="font-mono text-caption-mono-sm uppercase text-ink-subtle">Your photo stays on your device.</p>
    </div>
  )
}
