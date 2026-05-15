'use client'

type Mode = 'solo' | 'mix'

type Props = {
  mode: Mode
  onChange: (m: Mode) => void
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex items-center gap-px bg-white/10 font-mono">
      <Btn active={mode === 'solo'} onClick={() => onChange('solo')} label="Solo" />
      <Btn active={mode === 'mix'} onClick={() => onChange('mix')} label="Mix" />
    </div>
  )
}

function Btn({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
        active
          ? 'bg-white text-black'
          : 'bg-black text-white/50 hover:bg-white/5 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}
