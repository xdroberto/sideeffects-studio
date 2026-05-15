import { useState, useEffect, useCallback, useRef } from 'react'
import * as Tone from 'tone'

interface SynthSettings {
  tone: number
  space: number
  movement: number
  sparkle: number
}

interface FaderSettings {
  modulation: number
  resonance: number
}

interface ChordPattern {
  chord: string
  sections: ('high' | 'middle' | 'low')[]
}

interface ChordProgression {
  pattern: ChordPattern[]
}

export function useSynth() {
  const [isPoweredOn, setIsPoweredOn] = useState(false)
  const [settings, setSettings] = useState<SynthSettings>({
    tone: 0.5,
    space: 0.5,
    movement: 0.5,
    sparkle: 0.5
  })
  const [faderSettings, setFaderSettings] = useState<FaderSettings>({
    modulation: 0.5,
    resonance: 0.5
  })
  const [volume, setVolume] = useState(0.5)
  const [autoplayPattern, setAutoplayPattern] = useState(0)
  const [activeChord, setActiveChord] = useState<string | null>(null)
  const [activeSections, setActiveSections] = useState<('high' | 'middle' | 'low')[]>([])
  const [chordProgression, setChordProgression] = useState<ChordProgression>({
    pattern: [
      { chord: 'C', sections: ['middle'] },
      { chord: 'F', sections: ['middle'] },
      { chord: 'G', sections: ['middle'] },
      { chord: 'Am', sections: ['middle'] }
    ]
  })

  const synthRef = useRef<Tone.PolySynth | null>(null)
  const effectsRef = useRef<{
    filter: Tone.Filter | null,
    reverb: Tone.Reverb | null,
    chorus: Tone.Chorus | null,
    delay: Tone.FeedbackDelay | null
  }>({ filter: null, reverb: null, chorus: null, delay: null })
  const autoplayIntervalRef = useRef<number | null>(null)
  const progressionIndexRef = useRef(0)

  const getChordNotes = useCallback((chordName: string, section: 'high' | 'middle' | 'low') => {
    const chordMap: { [key: string]: { [key: string]: string[] } } = {
      'C': {
        high: ['E4', 'G4', 'C5'],
        middle: ['C4', 'E4', 'G4'],
        low: ['C3', 'G3']
      },
      'F': {
        high: ['A4', 'C5', 'F5'],
        middle: ['F4', 'A4', 'C5'],
        low: ['F3', 'C4']
      },
      'G': {
        high: ['B4', 'D5', 'G5'],
        middle: ['G4', 'B4', 'D5'],
        low: ['G3', 'D4']
      },
      'Am': {
        high: ['C5', 'E5', 'A5'],
        middle: ['A4', 'C5', 'E5'],
        low: ['A3', 'E4']
      },
      'Dm': {
        high: ['F4', 'A4', 'D5'],
        middle: ['D4', 'F4', 'A4'],
        low: ['D3', 'A3']
      },
      'Em': {
        high: ['G4', 'B4', 'E5'],
        middle: ['E4', 'G4', 'B4'],
        low: ['E3', 'B3']
      },
      'Bdim': {
        high: ['D5', 'F5', 'B5'],
        middle: ['B4', 'D5', 'F5'],
        low: ['B3', 'F4']
      },
      'E': {
        high: ['G#4', 'B4', 'E5'],
        middle: ['E4', 'G#4', 'B4'],
        low: ['E3', 'B3']
      }
    }

    if (!chordMap[chordName]) {
      console.warn(`Unknown chord: ${chordName}`)
      return []
    }

    return chordMap[chordName][section] || []
  }, [])

  const togglePower = useCallback(() => {
    setIsPoweredOn(prev => !prev)
  }, [])

  const createSynth = useCallback(() => {
    if (synthRef.current && !synthRef.current.disposed) {
      return synthRef.current
    }

    const newSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }
    }).toDestination()

    const filter = new Tone.Filter(1000, "lowpass").toDestination()
    const reverb = new Tone.Reverb({ decay: 5, wet: 0.5 }).toDestination()
    const chorus = new Tone.Chorus(4, 2.5, 0.5).start().toDestination()
    const delay = new Tone.FeedbackDelay(0.3, 0.5).toDestination()

    newSynth.chain(filter, reverb, chorus, delay, Tone.Destination)

    synthRef.current = newSynth
    effectsRef.current = { filter, reverb, chorus, delay }

    return newSynth
  }, [])

  const updateSynthParams = useCallback(() => {
    if (!synthRef.current || synthRef.current.disposed || !effectsRef.current.filter || !effectsRef.current.reverb || !effectsRef.current.chorus || !effectsRef.current.delay) return

    effectsRef.current.filter.frequency.rampTo(100 + settings.tone * 10000, 0.1)
    effectsRef.current.reverb.wet.rampTo(settings.space, 0.1)
    effectsRef.current.delay.wet.rampTo(settings.space * 0.5, 0.1)
    effectsRef.current.chorus.depth = settings.movement
    effectsRef.current.chorus.frequency.value = faderSettings.modulation * 10
    effectsRef.current.filter.Q.value = faderSettings.resonance * 10
    synthRef.current.set({
      envelope: {
        attack: 0.1 - settings.sparkle * 0.09,
        decay: 0.2 + settings.sparkle * 0.3,
        sustain: 0.5 - settings.sparkle * 0.3,
        release: 1 + settings.sparkle
      },
      oscillator: {
        type: settings.sparkle > 0.5 ? 'triangle' : 'sine'
      }
    })
    const maxVolume = 0
    const clampedVolume = Math.min(Math.max(volume, 0), 1)
    const adjustedVolume = clampedVolume * maxVolume
    synthRef.current.volume.value = Tone.gainToDb(adjustedVolume)
  }, [settings, faderSettings, volume])

  const clearAllNotes = useCallback(() => {
    if (synthRef.current && !synthRef.current.disposed) {
      synthRef.current.releaseAll()
    }
    setActiveChord(null)
    setActiveSections([])
  }, [])

  const playChord = useCallback((chord: string, sections: ('high' | 'middle' | 'low')[], duration: string = '4n') => {
    if (!synthRef.current || synthRef.current.disposed || !isPoweredOn) return

    const validNotes = sections.flatMap(section => getChordNotes(chord, section)).filter(Boolean)

    if (validNotes.length === 0) {
      console.warn(`No valid notes found for chord: ${chord}, sections: ${sections.join(', ')}`)
      return
    }

    synthRef.current.triggerAttackRelease(validNotes, duration)

    setActiveChord(chord)
    setActiveSections(prev => Array.from(new Set([...prev, ...sections])))
  }, [getChordNotes, isPoweredOn])

  const stopChord = useCallback((chord: string, sections: ('high' | 'middle' | 'low')[]) => {
    if (!synthRef.current || synthRef.current.disposed || !isPoweredOn) return

    const notes = sections.flatMap(section => getChordNotes(chord, section))
    synthRef.current.triggerRelease(notes)

    setActiveSections(prev => prev.filter(section => !sections.includes(section)))
    if (activeSections.length === 0) {
      setActiveChord(null)
    }
  }, [getChordNotes, isPoweredOn, activeSections])

  const startAutoplay = useCallback(() => {
    if (autoplayIntervalRef.current) {
      clearInterval(autoplayIntervalRef.current)
    }

    clearAllNotes()

    if (!chordProgression.pattern || chordProgression.pattern.length === 0) {
      console.warn('Chord progression is empty or undefined')
      return
    }

    const bpm = 120
    const intervalTime = (60 / bpm) * 1000

    autoplayIntervalRef.current = window.setInterval(() => {
      if (!synthRef.current || synthRef.current.disposed) return

      const currentPattern = chordProgression.pattern[progressionIndexRef.current]
      if (!currentPattern) {
        console.warn('No pattern found at current index')
        return
      }

      const { chord, sections } = currentPattern

      if (chord && sections && sections.length > 0) {
        const validSections = sections.filter(section =>
          ['high', 'middle', 'low'].includes(section) &&
          getChordNotes(chord, section as 'high' | 'middle' | 'low').length > 0
        )

        if (validSections.length > 0) {
          playChord(chord, validSections as ('high' | 'middle' | 'low')[], '2n')
        } else {
          console.warn(`Invalid chord or sections for autoplay: ${chord}, ${sections.join(', ')}`)
        }
      } else {
        console.warn(`Invalid pattern in progression: ${JSON.stringify(currentPattern)}`)
      }

      progressionIndexRef.current = (progressionIndexRef.current + 1) % chordProgression.pattern.length
    }, intervalTime)
  }, [chordProgression, playChord, clearAllNotes, getChordNotes])

  const updateChordProgression = useCallback((index: number, newPattern: ChordPattern) => {
    setChordProgression(prev => {
      const newPatternArray = [...prev.pattern]
      newPatternArray[index] = newPattern
      return { ...prev, pattern: newPatternArray }
    })
  }, [])

  const addChordToProgression = useCallback((newPattern: ChordPattern) => {
    setChordProgression(prev => ({
      ...prev,
      pattern: [...prev.pattern, newPattern]
    }))
  }, [])

  const removeChordFromProgression = useCallback((index: number) => {
    setChordProgression(prev => ({
      ...prev,
      pattern: prev.pattern.filter((_, i) => i !== index)
    }))
  }, [])

  useEffect(() => {
    if (isPoweredOn) {
      createSynth()
      updateSynthParams()
    } else {
      clearAllNotes()
      if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current)
      }
    }
  }, [isPoweredOn, createSynth, updateSynthParams, clearAllNotes])

  useEffect(() => {
    if (autoplayPattern > 0 && chordProgression.pattern && chordProgression.pattern.length > 0) {
      startAutoplay()
    } else {
      clearAllNotes()
      if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current)
      }
    }
  }, [autoplayPattern, chordProgression, startAutoplay, clearAllNotes])

  useEffect(() => {
    return () => {
      clearAllNotes()
      if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current)
      }
      if (synthRef.current && !synthRef.current.disposed) {
        synthRef.current.dispose()
      }
    }
  }, [clearAllNotes])

  return {
    synth: synthRef.current,
    settings,
    setSettings,
    faderSettings,
    setFaderSettings,
    volume,
    setVolume,
    isPoweredOn,
    togglePower,
    updateSynthParams,
    autoplayPattern,
    setAutoplayPattern,
    playChord,
    stopChord,
    activeChord,
    activeSections,
    chordProgression,
    updateChordProgression,
    addChordToProgression,
    removeChordFromProgression,
    clearAllNotes,
    startAutoplay
  }
}

