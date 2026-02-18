'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface KnobProps {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  label?: string
  color?: string
  disabled?: boolean
  size?: number
}

export function Knob({ value, min, max, step, onChange, label, color = "border-gray-500", disabled = false, size = 80 }: KnobProps) {
  const [rotation, setRotation] = useState(0)
  const knobRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startValue = useRef(0)

  useEffect(() => {
    const percentage = (value - min) / (max - min)
    setRotation(percentage * 270 - 135)
  }, [value, min, max])

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    event.preventDefault()
    startDrag(event.clientY)
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (disabled) return
    event.preventDefault()
    startDrag(event.touches[0].clientY)
  }

  const startDrag = (clientY: number) => {
    isDragging.current = true
    startY.current = clientY
    startValue.current = value
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('mouseup', stopDrag)
    document.addEventListener('touchend', stopDrag)
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (isDragging.current) {
      updateValue(event.clientY)
    }
  }

  const handleTouchMove = (event: TouchEvent) => {
    if (isDragging.current) {
      updateValue(event.touches[0].clientY)
    }
  }

  const stopDrag = () => {
    isDragging.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('mouseup', stopDrag)
    document.removeEventListener('touchend', stopDrag)
  }

  const updateValue = (clientY: number) => {
    const sensitivity = 200 // Adjust this value to change knob sensitivity
    const delta = (startY.current - clientY) / sensitivity
    const range = max - min
    let newValue = startValue.current + delta * range

    // Ensure the new value is within bounds and snapped to the step
    newValue = Math.max(min, Math.min(max, newValue))
    newValue = Math.round(newValue / step) * step

    if (newValue !== value) {
      onChange(newValue)
    }
  }

  const MotionDiv = motion.div as any

  return (
    <div className={`flex flex-col items-center ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div
        ref={knobRef}
        className={`rounded-full bg-neutral-800 cursor-pointer relative shadow-lg border-4 ${color} overflow-hidden`}
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <MotionDiv
          className="w-1 bg-white absolute left-1/2 bottom-1/2 origin-bottom rounded-full shadow-md"
          style={{
            rotate: rotation,
            height: size * 0.4,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      </div>
      {label && <span className="mt-2 text-sm font-medium text-neutral-300">{label}</span>}
    </div>
  )
}

