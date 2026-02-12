'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { motion } from "framer-motion"

interface Chord {
  name: string
  notes: string[]
  variations: {
    [key: string]: string[]
  }
}

const initialChords: Chord[] = [
  {
    name: 'C',
    notes: ['C4', 'E4', 'G4'],
    variations: {
      arpeggio: ['C4', 'E4', 'G4', 'C5'],
      inversion1: ['E4', 'G4', 'C5'],
      inversion2: ['G4', 'C5', 'E5']
    }
  },
  {
    name: 'F',
    notes: ['F4', 'A4', 'C5'],
    variations: {
      arpeggio: ['F4', 'A4', 'C5', 'F5'],
      inversion1: ['A4', 'C5', 'F5'],
      inversion2: ['C5', 'F5', 'A5']
    }
  },
  {
    name: 'G',
    notes: ['G4', 'B4', 'D5'],
    variations: {
      arpeggio: ['G4', 'B4', 'D5', 'G5'],
      inversion1: ['B4', 'D5', 'G5'],
      inversion2: ['D5', 'G5', 'B5']
    }
  },
  {
    name: 'Am',
    notes: ['A4', 'C5', 'E5'],
    variations: {
      arpeggio: ['A4', 'C5', 'E5', 'A5'],
      inversion1: ['C5', 'E5', 'A5'],
      inversion2: ['E5', 'A5', 'C6']
    }
  }
]

const ChordProgression: React.FC = () => {
  const [chords, setChords] = useState<Chord[]>(initialChords)
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null)
  const [sustain, setSustain] = useState(false)
  const [volume, setVolume] = useState(-12)
  const [activeChords, setActiveChords] = useState<{ [key: string]: boolean }>({})
  const [currentVariation, setCurrentVariation] = useState<string>('basic')
  const intervalRefs = useRef<{ [key: string]: NodeJS.Timeout }>({})

  useEffect(() => {
    const newSynth = new Tone.PolySynth(Tone.Synth).toDestination()
    newSynth.volume.value = volume
    setSynth(newSynth)

    return () => {
      newSynth.dispose()
    }
  }, [])

  useEffect(() => {
    if (synth) {
      synth.volume.value = volume
    }
  }, [volume, synth])

  const playChord = (chord: Chord, variation: string = 'basic') => {
    if (!synth) return

    let notesToPlay: string[]

    switch (variation) {
      case 'arpeggio':
        notesToPlay = chord.variations.arpeggio
        notesToPlay.forEach((note, index) => {
          synth.triggerAttackRelease(note, '8n', Tone.now() + index * 0.2)
        })
        break
      case 'inversion1':
      case 'inversion2':
        notesToPlay = chord.variations[variation]
        synth.triggerAttackRelease(notesToPlay, sustain ? '2n' : '8n')
        break
      default:
        notesToPlay = chord.notes
        synth.triggerAttackRelease(notesToPlay, sustain ? '2n' : '8n')
    }

    setActiveChords(prev => ({ ...prev, [chord.name]: true }))
    
    if (intervalRefs.current[chord.name]) {
      clearTimeout(intervalRefs.current[chord.name])
    }
    
    intervalRefs.current[chord.name] = setTimeout(() => {
      setActiveChords(prev => ({ ...prev, [chord.name]: false }))
    }, sustain ? 2000 : 500)
  }

  const changeKey = (newKey: string) => {
    // This is a simplified key change. In a real application, you'd need to implement proper transposition.
    const keyMap: { [key: string]: number } = { 'C': 0, 'G': 7, 'F': 5, 'Am': 9 }
    const semitones = keyMap[newKey] - keyMap['C']
    
    const newChords = chords.map(chord => ({
      ...chord,
      notes: chord.notes.map(note => Tone.Frequency(note).transpose(semitones).toNote()),
      variations: Object.entries(chord.variations).reduce((acc, [key, notes]) => ({
        ...acc,
        [key]: notes.map(note => Tone.Frequency(note).transpose(semitones).toNote())
      }), {})
    }))
    
    setChords(newChords)
  }

  return (
    <div className="p-6 bg-gray-900 rounded-lg shadow-lg text-white">
      <h2 className="text-3xl font-bold mb-6">Chord Progression</h2>
      <div className="mb-6 flex items-center space-x-4">
        <Select onValueChange={changeKey}>
          <SelectTrigger className="w-[180px] bg-gray-800 text-white border-gray-700">
            <SelectValue placeholder="Select key" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="C">C Major</SelectItem>
            <SelectItem value="G">G Major</SelectItem>
            <SelectItem value="F">F Major</SelectItem>
            <SelectItem value="Am">A Minor</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <span>Sustain</span>
          <input
            type="checkbox"
            checked={sustain}
            onChange={(e) => setSustain(e.target.checked)}
            className="form-checkbox h-5 w-5 text-blue-600 bg-gray-800 border-gray-700"
          />
        </div>
        <div className="flex items-center space-x-2">
          <span>Volume</span>
          <Slider
            value={[volume]}
            onValueChange={(value) => setVolume(value[0])}
            min={-60}
            max={0}
            step={1}
            className="w-32"
          />
        </div>
      </div>
      <div className="mb-4 flex justify-center space-x-4">
        {['basic', 'arpeggio', 'inversion1', 'inversion2'].map((variation) => (
          <Button
            key={variation}
            onClick={() => setCurrentVariation(variation)}
            className={`${currentVariation === variation ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-blue-700`}
          >
            {variation.charAt(0).toUpperCase() + variation.slice(1)}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {chords.map((chord) => (
          <motion.div
            key={chord.name}
            className={`flex flex-col space-y-2 p-4 rounded-lg ${
              activeChords[chord.name] ? 'bg-blue-600' : 'bg-gray-800'
            }`}
            animate={{
              scale: activeChords[chord.name] ? 1.05 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Button
              onClick={() => playChord(chord, currentVariation)}
              className="h-24 text-2xl font-bold bg-transparent hover:bg-blue-700"
            >
              {chord.name}
            </Button>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: "0%" }}
                animate={{
                  width: activeChords[chord.name] ? "100%" : "0%"
                }}
                transition={{
                  duration: sustain ? 2 : 0.5
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default ChordProgression

