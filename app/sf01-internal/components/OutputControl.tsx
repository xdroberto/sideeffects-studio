'use client'

import { useCallback, useEffect, useRef } from 'react'
import { ExternalLink, Monitor, X } from 'lucide-react'

type Props = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function OutputControl({ isOpen, setIsOpen }: Props) {
  const windowRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const open = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.focus()
      return
    }
    const features =
      'popup=yes,width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    const w = window.open('/sf01/output', 'sf01-output', features)
    if (!w) {
      alert('Popup bloqueado. Permite popups en el navegador para esta página.')
      return
    }
    windowRef.current = w
    setIsOpen(true)

    stopPolling()
    pollRef.current = setInterval(() => {
      if (w.closed) {
        stopPolling()
        windowRef.current = null
        setIsOpen(false)
      }
    }, 500)
  }, [setIsOpen, stopPolling])

  const close = useCallback(() => {
    windowRef.current?.close()
    windowRef.current = null
    stopPolling()
    setIsOpen(false)
  }, [setIsOpen, stopPolling])

  useEffect(() => {
    return () => {
      stopPolling()
      if (windowRef.current && !windowRef.current.closed) {
        windowRef.current.close()
      }
    }
  }, [stopPolling])

  if (isOpen) {
    return (
      <div className="flex items-center gap-0">
        <div className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] bg-white text-black border border-white">
          <Monitor size={14} />
          Output Live
        </div>
        <button
          type="button"
          onClick={close}
          title="Close output window"
          className="px-3 py-2 border border-white/40 border-l-0 text-white/70 hover:text-white hover:border-white/80 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={open}
      className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] bg-black text-white border border-white/40 hover:border-white hover:bg-white/5 transition-colors"
    >
      <ExternalLink size={14} />
      Open Output
    </button>
  )
}
