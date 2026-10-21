'use client'

import { useEffect, useRef } from 'react'

/** «Your word»: la palabra del visitante, aplicada 300 ms después de dejar de escribir. */
export function InkWordInput({ onWord, className = '' }: { onWord: (word: string) => void; className?: string }) {
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="font-mono text-caption-mono-sm uppercase text-ink-subtle">Your word</span>
      <input
        type="text"
        maxLength={24}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          const value = e.target.value
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => onWord(value), 300)
        }}
        className="w-full border-0 border-b border-line-strong bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-signal"
      />
    </label>
  )
}
