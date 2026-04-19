'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { effects } from '../lib/effects'

type Props = {
  currentId: string
  onChange: (id: string) => void
}

export function EffectPicker({ currentId, onChange }: Props) {
  return (
    <Select value={currentId} onValueChange={onChange}>
      <SelectTrigger className="w-56 bg-black border-white/20 text-white font-mono text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-black border-white/20 text-white font-mono">
        {effects.map((e) => (
          <SelectItem
            key={e.id}
            value={e.id}
            className="text-white focus:bg-white/10 focus:text-white"
          >
            {e.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
