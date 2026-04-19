'use client'

import { useState, useEffect, useCallback } from 'react'
import * as Tone from 'tone'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ChordPad {
  name: string
  notes: string[]
  variations: {
    arpeggio?: string[]
    inversion1?: string[]
    inversion2?: string[]
  }
  active: boolean
}

const initialChords: ChordPad[] = [
  { 
    name: 'C', 
    notes: ['C4', 'E4', 'G4'], 
    variations: {
      arpeggio: ['C4', 'E4', 'G4', 'C5'],
      inversion1: ['E4', 'G4', 'C5'],
      inversion2: ['G4', 'C5', 'E5']
    },
    active: false 
  },
  { name: 'F', notes: ['F4', 'A4', 'C5'], variations: { arpeggio: ['F4', 'A4', 'C5', 'F5'], inversion1: ['A4', 'C5', 'F5'], inversion2: ['C5', 'F5', 'A5'] }, active: false },
  { name: 'Bdim', notes: ['B4', 'D5', 'F5'], variations: { arpeggio: ['B4', 'D5', 'F5', 'B5'], inversion1: ['D5', 'F5', 'B5'], inversion2: ['F5', 'B5', 'D6'] }, active: false },
  { name: 'Em', notes: ['E4', 'G4', 'B4'], variations: { arpeggio: ['E4', 'G4', 'B4', 'E5'], inversion1: ['G4', 'B4', 'E5'], inversion2: ['B4', 'E5', 'G5'] }, active: false },
  { name: 'Am', notes: ['A4', 'C5', 'E5'], variations: { arpeggio: ['A4', 'C5', 'E5', 'A5'], inversion1: ['C5', 'E5', 'A5'], inversion2: ['E5', 'A5', 'C6'] }, active: false },
  { name: 'Dm', notes: ['D4', 'F4', 'A4'], variations: { arpeggio: ['D4', 'F4', 'A4', 'D5'], inversion1: ['F4', 'A4', 'D5'], inversion2: ['A4', 'D5', 'F5'] }, active: false },
  { name: 'G', notes: ['G4', 'B4', 'D5'], variations: { arpeggio: ['G4', 'B4', 'D5', 'G5'], inversion1: ['B4', 'D5', 'G5'], inversion2: ['D5', 'G5', 'B5'] }, active: false },
  { name: 'E', notes: ['E4', 'G#4', 'B4'], variations: { arpeggio: ['E4', 'G#4', 'B4', 'E5'], inversion1: ['G#4', 'B4', 'E5'], inversion2: ['B4', 'E5', 'G#5'] }, active: false },
]

interface ChordPadsProps {
  synth: Tone.PolySynth
  onChordPlay: (note: string) => void
}

export function ChordPads({ synth, onChordPlay }: ChordPadsProps) {
  const [chords, setChords] = useState<ChordPad[]>(initialChords)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentVariation, setCurrentVariation] = useState('basic')
  const [activeChord, setActiveChord] = useState<string | null>(null)
  const [sequence, setSequence] = useState<string[]>(new Array(8).fill(''))
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedStep, setSelectedStep] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying && synth && synth.disposed === false) {
      interval = setInterval(() => {
        setCurrentStep((prevStep) => {
          const nextStep = (prevStep + 1) % 8
          if (sequence[nextStep] !== '') {
            const chord = chords.find(chord => chord.name === sequence[nextStep])
            if (chord) {
              playChord(chord)
            }
          }
          return nextStep
        })
      }, 500) // 120 BPM, cada paso dura 500ms
    }

    return () => {
      if (interval) clearInterval(interval)
      if (synth && synth.disposed === false) {
        synth.releaseAll()
      }
    }
  }, [isPlaying, sequence, chords, synth])

  const playChord = useCallback((chord: ChordPad) => {
    if (synth && synth.disposed === false) {
      let notesToPlay: string[]
      switch (currentVariation) {
        case 'arpeggio':
          notesToPlay = chord.variations.arpeggio || chord.notes
          notesToPlay.forEach((note, index) => {
            synth.triggerAttackRelease(note, '8n', Tone.now() + index * 0.2)
          })
          break
        case 'inversion1':
          notesToPlay = chord.variations.inversion1 || chord.notes
          synth.triggerAttackRelease(notesToPlay, '4n')
          break
        case 'inversion2':
          notesToPlay = chord.variations.inversion2 || chord.notes
          synth.triggerAttackRelease(notesToPlay, '4n')
          break
        default:
          notesToPlay = chord.notes
          synth.triggerAttackRelease(notesToPlay, '4n')
      }
      setActiveChord(chord.name)
      onChordPlay(chord.name)
    }
  }, [synth, currentVariation, onChordPlay])

  const toggleSequenceStep = useCallback((step: number, chordName: string) => {
    setSequence(prev => {
      const newSequence = [...prev]
      newSequence[step] = newSequence[step] === chordName ? '' : chordName
      return newSequence
    })
  }, [])

  const clearSequence = useCallback(() => {
    setSequence(new Array(8).fill(''))
    setIsPlaying(false)
  }, [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-8 gap-2 mb-2">
        {sequence.map((chordName, index) => (
          <Button
            key={index}
            variant={chordName ? "default" : "outline"}
            className={`h-12 ${currentStep === index ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => {
              setCurrentStep(index)
              setSelectedStep(index)
            }}
          >
            {chordName || `Step ${index + 1}`}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {chords.map((chord, i) => (
          <div key={i} className="space-y-1">
            <Card 
              className={`bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer p-4 text-center font-medium text-white text-lg ${
                activeChord === chord.name ? 'ring-2 ring-white' : ''
              }`}
              onClick={() => {
                playChord(chord)
                toggleSequenceStep(selectedStep, chord.name)
              }}
            >
              {chord.name}
            </Card>
          </div>
        ))}
      </div>
      <div className="flex justify-center space-x-4 mt-4">
        <Button onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? 'Stop' : 'Play'}
        </Button>
        <Button onClick={clearSequence} variant="destructive">
          Clear
        </Button>
      </div>
    </div>
  )
}

