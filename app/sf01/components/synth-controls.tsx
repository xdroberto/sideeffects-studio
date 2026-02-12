'use client'

import React, { useCallback } from 'react'
import { Knob } from '../../components/ui/knob'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Power } from 'lucide-react'
import { Michroma as Microgramma } from 'next/font/google'
import './synth-controls.css'
import { Visualizer } from './visualizer'
import { ChordKeyboard } from './chord-keyboard'
import { useSynth } from '../hooks/useSynth'
import { CustomFader } from './CustomFader'

const microgramma = Microgramma({ subsets: ['latin'], weight: ['400'] })

const getColorForParam = (param: string) => {
  switch (param) {
    case 'tone': return 'border-red-500'
    case 'space': return 'border-blue-500'
    case 'movement': return 'border-green-500'
    case 'sparkle': return 'border-yellow-500'
    default: return 'border-gray-500'
  }
}

export function SynthControls() {
  const { 
    synth, 
    settings, 
    setSettings, 
    faderSettings, 
    setFaderSettings, 
    volume, 
    setVolume, 
    isPoweredOn, 
    togglePower,
    autoplayPattern,
    setAutoplayPattern,
    activeChord,
    activeSections,
    chordProgression,
    updateChordProgression,
    addChordToProgression,
    removeChordFromProgression,
    clearAllNotes,
    playChord,
    stopChord,
    startAutoplay
  } = useSynth()

  const [currentEffect, setCurrentEffect] = React.useState<'particles' | 'toon'>('particles')
  const visualizerRef = React.useRef<any>(null)

  const handleSettingChange = useCallback((param: keyof typeof settings, value: number) => {
    setSettings(prev => ({
      ...prev,
      [param]: value
    }))
  }, [setSettings])

  const handleFaderChange = useCallback((param: string, value: number) => {
    if (param === 'volume') {
      setVolume(value)
    } else {
      setFaderSettings(prev => ({ ...prev, [param]: value }))
    }
  }, [setVolume, setFaderSettings])

  const handleAutoplayChange = useCallback((value: number) => {
    setAutoplayPattern(Math.round(value * 4))
    if (value > 0) {
      startAutoplay()
    } else {
      clearAllNotes()
    }
  }, [setAutoplayPattern, startAutoplay, clearAllNotes])

  const getAutoplayLabel = (value: number) => {
    switch(value) {
      case 0: return 'OFF'
      case 1: return 'Simple'
      case 2: return 'Arpeggio'
      case 3: return 'Rhythm'
      case 4: return 'Complex'
      default: return 'OFF'
    }
  }

  return (
    <div className="bg-black min-h-screen w-full md:p-6 md:min-h-0">
      <Card className="bg-gray-900 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-red-600 p-4">
          <CardTitle className={`flex items-center justify-between text-2xl md:text-3xl font-light tracking-wider text-red-500 ${microgramma.className}`}>
            <div className="flex">
              {isPoweredOn ? (
                "SF-01 Synth".split('').map((char, index) => (
                  <span
                    key={index}
                    className="animate-knight-rider"
                    style={{
                      animationDelay: `${index * 0.1}s`,
                    }}
                  >
                    {char}
                  </span>
                ))
              ) : (
                "SF-01 Synth"
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`
                w-12 h-12
                rounded-full 
                border-4 
                ${isPoweredOn 
                  ? 'bg-green-500 border-green-300 shadow-[inset_0_-4px_0_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.2)]' 
                  : 'bg-red-500 border-red-300 shadow-[inset_0_-4px_0_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.2)]'
                }
                hover:brightness-110
                active:shadow-[inset_0_4px_0_rgba(0,0,0,0.2)]
                active:translate-y-[2px]
                transition-all duration-150 ease-in-out
              `}
              onClick={togglePower}
            >
              <Power className="h-6 w-6 text-white" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className={`p-4 ${isPoweredOn ? 'opacity-100' : 'opacity-50'}`}>
          <div className="relative mb-4">
            <div className="w-full bg-black rounded-lg border border-red-600 shadow-inner overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <Visualizer
                currentEffect={currentEffect}
                setCurrentEffect={setCurrentEffect}
                isPoweredOn={isPoweredOn}
                ref={visualizerRef}
              />
            </div>
          </div>
          <div className="flex justify-around items-center px-4 py-2 bg-black/20 rounded-lg mb-4">
            {['particles', 'toon'].map((effect) => (
              <div key={effect} className="flex flex-col items-center space-y-2">
                <div 
                  className={`w-16 h-8 rounded-full p-1 cursor-pointer transition-all duration-300 ${
                    currentEffect === effect 
                      ? 'bg-red-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]' 
                      : 'bg-gray-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
                  }`}
                  onClick={() => isPoweredOn && setCurrentEffect(effect as 'particles' | 'toon')}
                >
                  <div 
                    className={`w-6 h-6 rounded-full transition-all duration-300 ${
                      currentEffect === effect 
                        ? 'bg-white translate-x-full shadow-[0_2px_4px_rgba(0,0,0,0.3)]' 
                        : 'bg-gray-400 shadow-[0_2px_4px_rgba(0,0,0,0.3)]'
                    }`}
                  />
                </div>
                <span className="text-xs text-red-400 capitalize">{effect}</span>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-red-500 mb-4">Chord Keyboard</h3>
            {synth && (
              <ChordKeyboard 
                synth={synth} 
                onChordPlay={playChord}
                onChordStop={stopChord}
                activeChord={activeChord}
                activeSections={activeSections}
                chordProgression={chordProgression}
                updateChordProgression={updateChordProgression}
                addChordToProgression={addChordToProgression}
                removeChordFromProgression={removeChordFromProgression}
                autoplayPattern={autoplayPattern}
                currentProgressionIndex={0}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-red-500">Main Controls</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(settings).map(([param, value]) => (
                  <div key={param} className="flex flex-col items-center">
                    <Knob
                      value={value}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(newValue) => handleSettingChange(param as keyof typeof settings, newValue)}
                      color={`border-2 ${getColorForParam(param)}`}
                      disabled={!isPoweredOn}
                    />
                    <span className="mt-2 text-sm font-medium text-red-500">{param.charAt(0).toUpperCase() + param.slice(1)}</span>
                    <span className="text-xs text-red-400">{Math.round(value * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-red-500">Fine Tuning</h3>
              <div className="flex justify-around items-end h-40">
                {Object.entries({ ...faderSettings, volume }).map(([param, value]) => (
                  <CustomFader
                    key={param}
                    value={value}
                    onChange={(newValue) => handleFaderChange(param, newValue)}
                    label={param}
                    className="w-2 h-32"
                  />
                ))}
              </div>
              <div className="flex justify-center items-center mt-4">
                <div className="flex flex-col items-center">
                  <Knob
                    value={autoplayPattern / 4}
                    min={0}
                    max={1}
                    step={0.25}
                    onChange={handleAutoplayChange}
                    color="border-2 border-purple-500"
                    disabled={!isPoweredOn}
                    size={40}
                  />
                  <span className="mt-2 text-xs font-medium text-purple-500">Autoplay</span>
                  <span className="text-xs text-purple-400">{getAutoplayLabel(autoplayPattern)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <span className="text-xs text-red-500 uppercase tracking-wide">
              {isPoweredOn ? 'System Online' : 'Standby'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SynthControls;

