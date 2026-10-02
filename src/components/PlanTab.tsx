import { useState } from 'react'
import { REQUIREMENTS } from '../data'

interface Props {
  targetUnits: string
  setTargetUnits: (v: string) => void
  unavailable: string
  setUnavailable: (v: string) => void
  priorities: string[]
  setPriorities: (p: string[]) => void
  onGenerate: () => void
  note: string
}

export default function PlanTab(p: Props) {
  const [drag, setDrag] = useState<number | null>(null)
  const move = (to: number) => {
    if (drag === null || drag === to) return
    const next = [...p.priorities]
    const [it] = next.splice(drag, 1)
    next.splice(to, 0, it)
    p.setPriorities(next)
    setDrag(to)
  }
  return (
    <div className="space-y-4 p-4">
      {REQUIREMENTS.slice(1).map((r) => (
        <div key={r.name} className="border-b border-slate-200 pb-3">
          <div className="flex items-end justify-between">
            <div className="text-base font-semibold">{r.name}</div>
            <div className="text-right text-sm"><b>{r.done} / {r.total}</b><div className="text-xs text-slate-500">{r.total - r.done} units remaining</div></div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-900" style={{ width: `${(r.done / r.total) * 100}%` }} /></div>
        </div>
      ))}
      <div className="flex items-start gap-2">
        <span className="icon text-xl text-brand-900">lock</span>
        <div><div className="font-semibold">Must have</div><div className="text-xs text-slate-500">Candidates that break these conditions are rejected.</div></div>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-300 bg-white p-3">
        <label className="block text-sm font-medium">Target units
          <input value={p.targetUnits} onChange={(e) => p.setTargetUnits(e.target.value)} placeholder="e.g. 12" inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-brand-700" />
        </label>
        <label className="block text-sm font-medium">Unavailable time
          <input value={p.unavailable} onChange={(e) => p.setUnavailable(e.target.value)} placeholder="e.g. Fri, Mon"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-brand-700" />
        </label>
        <div className="text-xs text-slate-500">Current candidate meetings are checked immediately.</div>
      </div>
      <button onClick={p.onGenerate} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-900 py-3 text-sm font-semibold text-white hover:bg-brand-700">
        <span className="icon text-lg">auto_awesome</span>Generate proposed schedule
      </button>
      {p.note && <div className="rounded-lg bg-brand-100 p-3 text-xs text-brand-900">{p.note}</div>}
      <div className="flex items-start gap-2">
        <span className="icon text-xl text-brand-900">tune</span>
        <div><div className="font-semibold">Prioritize, in this order</div><div className="text-xs text-slate-500">Rank flexible priorities; trade-offs will cite schedule facts.</div></div>
      </div>
      <ul className="space-y-2">
        {p.priorities.map((name, i) => (
          <li key={name} draggable onDragStart={() => setDrag(i)} onDragEnter={() => move(i)} onDragEnd={() => setDrag(null)} onDragOver={(e) => e.preventDefault()}
            className="flex cursor-grab items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-medium">
            <span className="grid size-6 place-items-center rounded bg-brand-100 text-xs font-semibold">{i + 1}</span>
            <span className="flex-1">{name}</span>
            <span className="icon text-slate-700">drag_indicator</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
