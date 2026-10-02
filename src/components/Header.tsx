export type Step = 'pathway' | 'setup' | 'degree' | 'build' | 'review'

const STEPS: { id: Step; label: string }[] = [
  { id: 'pathway', label: 'Program setup' },
  { id: 'degree', label: 'Degree overview' },
  { id: 'build', label: 'Build schedule' },
]

export default function Header({ step, onStep }: { step: Step; onStep: (s: Step) => void }) {
  return (
    <header className="flex items-center justify-between bg-brand-900 px-8 py-3 text-white">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-white text-brand-900">
          <span className="icon text-[22px]">school</span>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">SF State Schedule Studio</div>
          <div className="text-xs text-white/70">Planning support with Gemini</div>
        </div>
      </div>
      <nav className="flex gap-1 rounded-xl bg-white/10 p-1">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => onStep(s.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${(step === s.id || (s.id === 'pathway' && step === 'setup')) ? 'bg-white text-brand-900' : 'text-white/90 hover:bg-white/10'}`}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <div className="flex items-center gap-6 text-xs">
        <span className="flex items-center gap-1.5 text-white/80">
          <span className="icon text-base">shield_person</span>Planning only
        </span>
        <span className="font-medium">Help</span>
      </div>
    </header>
  )
}
