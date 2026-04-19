'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type AudioBands = {
  low: number
  mid: number
  high: number
  level: number
}

export const ZERO_BANDS: AudioBands = { low: 0, mid: 0, high: 0, level: 0 }

export type AudioSourceKind = 'none' | 'mic' | 'file'

export type UseAudioSourceReturn = {
  source: AudioSourceKind
  isActive: boolean
  error: string | null
  sensitivity: number
  smoothing: number
  fileName: string | null
  setSensitivity: (n: number) => void
  setSmoothing: (n: number) => void
  requestMic: () => Promise<void>
  loadFile: (file: File) => Promise<void>
  stop: () => void
  getBands: () => AudioBands
  bandsRef: React.RefObject<AudioBands>
}

export function useAudioSource(): UseAudioSourceReturn {
  const [source, setSource] = useState<AudioSourceKind>('none')
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sensitivity, setSensitivity] = useState(1.5)
  const [smoothing, setSmoothing] = useState(0.45)
  const [fileName, setFileName] = useState<string | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceNodeRef = useRef<AudioNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const freqBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const timeBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const bandsRef = useRef<AudioBands>({ ...ZERO_BANDS })

  const sensitivityRef = useRef(sensitivity)
  const smoothingRef = useRef(smoothing)

  useEffect(() => {
    sensitivityRef.current = sensitivity
  }, [sensitivity])
  useEffect(() => {
    smoothingRef.current = smoothing
  }, [smoothing])

  const ensureContext = useCallback(() => {
    if (ctxRef.current) return
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.5
    ctxRef.current = ctx
    analyserRef.current = analyser
    freqBufferRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    timeBufferRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize))
  }, [])

  const stop = useCallback(() => {
    if (audioElRef.current) {
      try {
        audioElRef.current.pause()
      } catch {}
      audioElRef.current.src = ''
      audioElRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect()
      } catch {}
      sourceNodeRef.current = null
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect()
      } catch {}
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {})
      ctxRef.current = null
      analyserRef.current = null
    }
    bandsRef.current = { ...ZERO_BANDS }
    setIsActive(false)
    setSource('none')
    setFileName(null)
    setError(null)
  }, [])

  const requestMic = useCallback(async () => {
    try {
      stop()
      ensureContext()
      if (!ctxRef.current || !analyserRef.current) return
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream
      const src = ctxRef.current.createMediaStreamSource(stream)
      src.connect(analyserRef.current)
      sourceNodeRef.current = src
      setSource('mic')
      setIsActive(true)
      setError(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'microphone error'
      setError(msg)
      stop()
    }
  }, [stop, ensureContext])

  const loadFile = useCallback(
    async (file: File) => {
      try {
        stop()
        ensureContext()
        if (!ctxRef.current || !analyserRef.current) return
        const url = URL.createObjectURL(file)
        objectUrlRef.current = url
        const el = new Audio(url)
        el.loop = true
        el.crossOrigin = 'anonymous'
        audioElRef.current = el
        await el.play()
        const src = ctxRef.current.createMediaElementSource(el)
        src.connect(analyserRef.current)
        analyserRef.current.connect(ctxRef.current.destination)
        sourceNodeRef.current = src
        setFileName(file.name)
        setSource('file')
        setIsActive(true)
        setError(null)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'file playback error'
        setError(msg)
        stop()
      }
    },
    [stop, ensureContext]
  )

  useEffect(() => {
    if (!isActive) return
    let raf = 0
    const tick = () => {
      const analyser = analyserRef.current
      const freq = freqBufferRef.current
      const time = timeBufferRef.current
      if (!analyser || !freq || !time) {
        raf = requestAnimationFrame(tick)
        return
      }
      analyser.getByteFrequencyData(freq)
      analyser.getByteTimeDomainData(time)

      let lo = 0
      let md = 0
      let hi = 0
      for (let i = 0; i < 10; i++) lo += freq[i]
      for (let i = 10; i < 40; i++) md += freq[i]
      for (let i = 40; i < 128; i++) hi += freq[i]
      lo = lo / 10 / 255
      md = md / 30 / 255
      hi = hi / 88 / 255

      let sumSq = 0
      for (let i = 0; i < time.length; i++) {
        const v = (time[i] - 128) / 128
        sumSq += v * v
      }
      const rms = Math.sqrt(sumSq / time.length)

      const gain = sensitivityRef.current
      const lvl = Math.min(1, rms * gain * 2)
      lo = Math.min(1, lo * gain)
      md = Math.min(1, md * gain)
      hi = Math.min(1, hi * gain)

      const s = smoothingRef.current
      const prev = bandsRef.current
      bandsRef.current = {
        low: prev.low * s + lo * (1 - s),
        mid: prev.mid * s + md * (1 - s),
        high: prev.high * s + hi * (1 - s),
        level: prev.level * s + lvl * (1 - s),
      }

      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [isActive])

  useEffect(() => {
    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getBands = useCallback(() => bandsRef.current, [])

  return {
    source,
    isActive,
    error,
    sensitivity,
    smoothing,
    fileName,
    setSensitivity,
    setSmoothing,
    requestMic,
    loadFile,
    stop,
    getBands,
    bandsRef: bandsRef as React.RefObject<AudioBands>,
  }
}
