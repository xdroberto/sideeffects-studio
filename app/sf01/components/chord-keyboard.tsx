'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import * as Tone from 'tone'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Chord {
  name: string
  notes: {
    high: string[]
    middle: string[]
    low: string[]
  }
}

const chords: Chord[] = [
  {
    name: 'C',
    notes: {
      high: ['E4', 'G4', 'C5'],
      middle: ['C4', 'E4', 'G4'],
      low: ['C3', 'G3']
    }
  },
  {
    name: 'F',
    notes: {
      high: ['A4', 'C5', 'F5'],
      middle: ['F4', 'A4', 'C5'],
      low: ['F3', 'C4']
    }
  },
  {
    name: 'Bdim',
    notes: {
      high: ['D5', 'F5', 'B5'],
      middle: ['B4', 'D5', 'F5'],
      low: ['B3', 'F4']
    }
  },
  {
    name: 'Em',
    notes: {
      high: ['G4', 'B4', 'E5'],
      middle: ['E4', 'G4', 'B4'],
      low: ['E3', 'B3']
    }
  },
  {
    name: 'Am',
    notes: {
      high: ['C5', 'E5', 'A5'],
      middle: ['A4', 'C5', 'E5'],
      low: ['A3', 'E4']
    }
  },
  {
    name: 'Dm',
    notes: {
      high: ['F4', 'A4', 'D5'],
      middle: ['D4', 'F4', 'A4'],
      low: ['D3', 'A3']
    }
  },
  {
    name: 'G',
    notes: {
      high: ['B4', 'D5', 'G5'],
      middle: ['G4', 'B4', 'D5'],
      low: ['G3', 'D4']
    }
  },
  {
    name: 'E',
    notes: {
      high: ['G#4', 'B4', 'E5'],
      middle: ['E4', 'G#4', 'B4'],
      low: ['E3', 'B3']
    }
  }
]

interface ChordKeyboardProps {
  synth: Tone.PolySynth | null
  onChordPlay: (chordName: string, sections: ('high' | 'middle' | 'low')[]) => void
  onChordStop: (chordName: string, sections: ('high' | 'middle' | 'low')[]) => void
  activeChord: string | null
  activeSections: ('high' | 'middle' | 'low')[]
  chordProgression: {
    pattern: Array<{ chord: string; sections: ('high' | 'middle' | 'low')[] }>
  }
  updateChordProgression: (index: number, newPattern: { chord: string; sections: ('high' | 'middle' | 'low')[] }) => void
  addChordToProgression: (newPattern: { chord: string; sections: ('high' | 'middle' | 'low')[] }) => void
  removeChordFromProgression: (index: number) => void
  autoplayPattern: number
  currentProgressionIndex: number
}

export function ChordKeyboard({ 
  synth, 
  onChordPlay, 
  onChordStop,
  activeChord, 
  activeSections,
  chordProgression,
  updateChordProgression,
  addChordToProgression,
  removeChordFromProgression,
  autoplayPattern,
  currentProgressionIndex
}: ChordKeyboardProps) {
  const [localActiveNotes, setLocalActiveNotes] = useState<{[key: string]: ('high' | 'middle' | 'low')[]}>({})
  const timeoutRefs = useRef<{[key: string]: NodeJS.Timeout}>({})
  const isMounted = useRef(true)
  //const activeNotesRef = useRef<Array<{chord: string; section: 'high' | 'middle' | 'low'; releaseTime: number}>>([]);

  useEffect(() => {
    return () => {
      isMounted.current = false
      Object.values(timeoutRefs.current).forEach(clearTimeout)
    }
  }, [])

  const playChord = useCallback((chord: Chord, sections: ('high' | 'middle' | 'low')[]) => {
    if (!synth || !isMounted.current || synth.disposed || !chord || sections.length === 0) return

    if (timeoutRefs.current[chord.name]) {
      clearTimeout(timeoutRefs.current[chord.name])
    }

    try {
      const notes = sections.flatMap(section => chord.notes[section])
      if (notes.length === 0) {
        console.warn(`No notes found for chord ${chord.name} and sections ${sections.join(', ')}`)
        return
      }

      synth.triggerAttack(notes)
      setLocalActiveNotes(prev => ({
        ...prev,
        [chord.name]: Array.from(new Set([...(prev[chord.name] || []), ...sections]))
      }))
      onChordPlay(chord.name, sections)

      timeoutRefs.current[chord.name] = setTimeout(() => {
        if (synth && !synth.disposed && isMounted.current) {
          synth.triggerRelease(notes)
          setLocalActiveNotes(prev => {
            const updatedSections = prev[chord.name]?.filter(s => !sections.includes(s)) || []
            return {
              ...prev,
              [chord.name]: updatedSections.length ? updatedSections : undefined
            }
          })
          onChordStop(chord.name, sections)
        }
      }, 2000)
    } catch (error) {
      console.error("Error playing chord:", error)
    }
  }, [synth, onChordPlay, onChordStop])

  const stopChord = useCallback((chord: Chord, sections: ('high' | 'middle' | 'low')[]) => {
    if (!synth || !isMounted.current || synth.disposed) {
      console.warn("Synth not available or disposed when trying to stop chord", { chord: chord.name, sections });
      return;
    }

    if (!chord || !Array.isArray(sections) || sections.length === 0) {
      console.warn("Invalid chord or sections", { chord, sections });
      return;
    }

    if (timeoutRefs.current[chord.name]) {
      clearTimeout(timeoutRefs.current[chord.name]);
      delete timeoutRefs.current[chord.name];
    }

    try {
      const notes = sections.flatMap(section => chord.notes[section] || []);
      if (notes.length === 0) {
        console.warn("No notes found for chord and sections", { chord: chord.name, sections });
        return;
      }
      synth.triggerRelease(notes);
      setLocalActiveNotes(prev => {
        const updatedSections = prev[chord.name]?.filter(s => !sections.includes(s)) || [];
        return {
          ...prev,
          [chord.name]: updatedSections.length ? updatedSections : undefined
        };
      });
      onChordStop(chord.name, sections);
    } catch (error) {
      console.error("Error stopping chord:", error, { chord: chord.name, sections });
    }
  }, [synth, onChordStop]);

  const toggleChordInProgression = useCallback((chord: Chord, section: 'high' | 'middle' | 'low') => {
    const existingIndex = chordProgression.pattern.findIndex(p => p.chord === chord.name)
    if (existingIndex !== -1) {
      const existingPattern = chordProgression.pattern[existingIndex]
      const newSections = existingPattern.sections.includes(section)
        ? existingPattern.sections.filter(s => s !== section)
        : [...existingPattern.sections, section]
      
      if (newSections.length === 0) {
        removeChordFromProgression(existingIndex)
      } else {
        updateChordProgression(existingIndex, { chord: chord.name, sections: newSections })
      }
    } else {
      addChordToProgression({ chord: chord.name, sections: [section] })
    }
  }, [chordProgression, updateChordProgression, addChordToProgression, removeChordFromProgression])

  const isChordActive = useCallback((chordName: string, section: 'high' | 'middle' | 'low') => {
    if (autoplayPattern > 0) {
      const currentChord = chordProgression.pattern[currentProgressionIndex];
      return currentChord && currentChord.chord === chordName && currentChord.sections.includes(section);
    } else {
      return activeChord === chordName && activeSections.includes(section);
    }
  }, [autoplayPattern, chordProgression, currentProgressionIndex, activeChord, activeSections])

  const isChordInProgression = useCallback((chordName: string, section: 'high' | 'middle' | 'low') => {
    return chordProgression.pattern.some(p => p.chord === chordName && p.sections.includes(section))
  }, [chordProgression])

  const handleMouseDown = useCallback((chord: Chord, section: 'high' | 'middle' | 'low') => {
    playChord(chord, [section])
  }, [playChord])

  const handleMouseUp = useCallback((chord: Chord, section: 'high' | 'middle' | 'low') => {
    stopChord(chord, [section])
  }, [stopChord])

  const handleMouseLeave = useCallback((chord: Chord, section: 'high' | 'middle' | 'low') => {
    if (localActiveNotes[chord.name]?.includes(section)) {
      stopChord(chord, [section]);
    }
  }, [stopChord, localActiveNotes]);

  const memoizedChordButtons = useMemo(() => (
    <div className="grid grid-cols-8 gap-1 bg-black p-1 rounded-lg">
      {chords.map((chord) => (
        <div key={chord.name} className="flex flex-col gap-1">
          {['high', 'middle', 'low'].map((section) => (
            <button
              key={`${chord.name}-${section}`}
              className={cn(
                "rounded-sm transition-colors relative",
                section === 'middle' ? "h-32" : "h-16",
                isChordActive(chord.name, section as 'high' | 'middle' | 'low')
                  ? "bg-cyan-400" 
                  : "bg-white hover:bg-gray-100",
                isChordInProgression(chord.name, section as 'high' | 'middle' | 'low') &&
                  "ring-2 ring-purple-500"
              )}
              onMouseDown={() => handleMouseDown(chord, section as 'high' | 'middle' | 'low')}
              onMouseUp={() => handleMouseUp(chord, section as 'high' | 'middle' | 'low')}
              onMouseLeave={() => handleMouseLeave(chord, section as 'high' | 'middle' | 'low')}
              onClick={() => {
                if (autoplayPattern > 0) {
                  toggleChordInProgression(chord, section as 'high' | 'middle' | 'low')
                }
              }}
              aria-pressed={isChordActive(chord.name, section as 'high' | 'middle' | 'low')}
            >
              {section === 'high' && (
                <span className="text-xs text-gray-600">{chord.name}</span>
              )}
              {(() => {
                const index = chordProgression.pattern.findIndex(p => p.chord === chord.name);
                if (index !== -1 && chordProgression.pattern[index].sections.includes(section as 'high' | 'middle' | 'low')) {
                  return (
                    <span className="absolute top-1 right-1 text-[10px] text-purple-500">
                      {index + 1}
                    </span>
                  );
                }
                return null;
              })()}
            </button>
          ))}
        </div>
      ))}
    </div>
  ), [chords, isChordActive, isChordInProgression, handleMouseDown, handleMouseUp, handleMouseLeave, toggleChordInProgression, autoplayPattern, chordProgression.pattern]);

  return (
    <div className="space-y-4">
      {memoizedChordButtons}
      {autoplayPattern > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {chordProgression.pattern.map((pattern, index) => (
            <div key={index} className="flex items-center space-x-2 bg-gray-800 p-2 rounded-md">
              <span className="text-white">{pattern.chord}</span>
              <div className="flex space-x-1">
                {['high', 'middle', 'low'].map((section) => (
                  <div
                    key={section}
                    className={cn(
                      "w-4 h-4 rounded-sm cursor-pointer",
                      pattern.sections.includes(section as 'high' | 'middle' | 'low')
                        ? "bg-purple-500"
                        : "bg-gray-400"
                    )}
                    onClick={() => {
                      const newSections = pattern.sections.includes(section as 'high' | 'middle' | 'low')
                        ? pattern.sections.filter(s => s !== section)
                        : [...pattern.sections, section as 'high' | 'middle' | 'low']
                      if (newSections.length === 0) {
                        removeChordFromProgression(index)
                      } else {
                        updateChordProgression(index, { ...pattern, sections: newSections })
                      }
                    }}
                    role="checkbox"
                    aria-checked={pattern.sections.includes(section as 'high' | 'middle' | 'low')}
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        const newSections = pattern.sections.includes(section as 'high' | 'middle' | 'low')
                          ? pattern.sections.filter(s => s !== section)
                          : [...pattern.sections, section as 'high' | 'middle' | 'low']
                        if (newSections.length === 0) {
                          removeChordFromProgression(index)
                        } else {
                          updateChordProgression(index, { ...pattern, sections: newSections })
                        }
                      }
                    }}
                  />
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeChordFromProgression(index)}
                aria-label={`Remove ${pattern.chord} from progression`}
              >
                X
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChordKeyboard;

