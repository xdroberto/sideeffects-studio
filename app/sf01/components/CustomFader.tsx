import React, { useCallback, useRef, useState, useEffect } from 'react'

interface CustomFaderProps {
  value: number
  onChange: (value: number) => void
  label: string
  className?: string
}

export const CustomFader: React.FC<CustomFaderProps> = ({ value, onChange, label, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false)
  const faderRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientY: number) => {
    if (faderRef.current) {
      const rect = faderRef.current.getBoundingClientRect()
      const handleHeight = 24 // Height of the handle in pixels
      const trackHeight = rect.height - handleHeight // Adjust for handle height
      const relativeY = clientY - rect.top - (handleHeight / 2)
      const newValue = 1 - Math.max(0, Math.min(1, relativeY / trackHeight))
      onChange(newValue)
    }
  }, [onChange])

  const handleStart = useCallback((clientY: number) => {
    setIsDragging(true)
    handleMove(clientY)
  }, [handleMove])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientY)
  }, [handleStart])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    handleStart(e.touches[0].clientY)
  }, [handleStart])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault()
        handleMove(e.clientY)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault()
        handleMove(e.touches[0].clientY)
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchend', handleEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, handleMove])

  // Calculate positions for the fill and handle
  const handleHeight = 24 // Height of the handle in pixels
  const fillHeight = `${value * 100}%`
  const handlePosition = `${(1 - value) * (100 - (handleHeight * 100 / (faderRef.current?.clientHeight || 100)))}%`

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        ref={faderRef}
        className="w-full h-24 bg-gray-800 rounded-lg relative overflow-hidden cursor-pointer touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Track background */}
        <div className="absolute inset-0 bg-gray-700" />
        
        {/* Fill bar */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-red-600 transition-all duration-75"
          style={{ height: fillHeight }}
        />
        
        {/* Handle */}
        <div
          className="absolute left-0 right-0 h-6 bg-red-400 rounded-full shadow-md transition-all duration-75"
          style={{ top: handlePosition }}
        />
      </div>
      <span className="mt-2 text-xs font-medium text-red-500">{label}</span>
      <span className="text-xs text-red-400">
        {label === 'volume' ? `${Math.round(value * 50)}%` : `${Math.round(value * 100)}%`}
      </span>
    </div>
  )
}

