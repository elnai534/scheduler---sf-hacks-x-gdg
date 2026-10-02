import { useState } from 'react'
import { DAYS, REQUIREMENTS, cid } from '../data'
import type { DprReport } from '../dpr/types'
import type { Recommendation } from '../recommend/recommend'
import type { Prefs } from '../recommend/recommend'

interface Props {
  prefs: Prefs
  setPrefs: (p: Prefs) => void
  priorities: string[]
  setPriorities: (p: string[]) => void
  onGenerate: () => void
  hasReport: boolean
  report: DprReport | null
  rec: Recommendation | null
  note: string
}

const Toggle = ({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) => (
  <label className="flex cursor-pointer items-start gap-3">
    <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 accent-[#2d1b69]" />
    <span><span className="text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-slate-500">{hint}</span>}</span>
  </label>
)

export default function PlanTab(p: Props) {
  const [drag, setDrag] = useState<number | null>(null)
  const set = (patch: Partial<Prefs>) => p.setPrefs({ ...p.prefs, ...patch })
  const move = (to: number) => {
    if (drag === null || drag === to) return
    const next = [...p.priorities]
    const [it] = next.splice(drag, 1)
    next.splice(to, 0, it)
    p.setPriorities(next)
    setDrag(to)
  }
  const toggleDay = (d: (typeof DAYS)[number]) => set({ days: p.prefs.days.includes(d) ? p.prefs.days.filter((x) => x !== d) : [...p.prefs.days, d] })
  const reqs = p.report?.requirements.filter((q) => q.status !== 'unknown') ?? []
  const groups = p.report && reqs.length
    ? [...new Set(reqs.map((q) => q.section || 'Requirements'))].map((name) => {
        const items = reqs.filter((q) => (q.section || 'Requirements') === name)
        return { name, items, done: items.filter((q) => q.status === 'filled').length }
      })
    : null
  const totalAll = reqs.length
  const totalDone = reqs.filter((q) => q.status === 'filled').length
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-2">
        <span className="icon text-xl text-brand-900">tune</span>
        <div><div className="font-semibold">Requirement progress</div><div className="text-xs text-slate-500">In-progress requirements</div></div>
      </div>
      {groups ? (
        <>
          <div className="rounded-lg bg-brand-100 px-3 py-2 text-sm">Total requirements: <b>{totalDone} / {totalAll}</b> <span className="text-xs text-slate-600">completed or in progress / total to graduate</span></div>
          {groups.map((g) => (
            <details key={g.name} className="border-b border-slate-200 pb-3">
              <summary className="flex cursor-pointer items-end justify-between">
                <div className="text-base font-semibold">{g.name}</div>
                <div className="flex items-end gap-2 text-right text-sm"><div><b>{g.done} / {g.items.length}</b><div className="text-xs text-slate-500">{g.items.length - g.done} remaining</div></div><span className="icon text-slate-500">expand_more</span></div>
              </summary>
              <div className="mt-2 h-1.5 rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-900" style={{ width: `${(g.done / g.items.length) * 100}%` }} /></div>
              <ul className="mt-2 space-y-1 text-xs">
                {g.items.map((q) => <li key={q.id} className="flex items-start gap-1.5"><span className={`icon text-sm ${q.status === 'open' ? 'text-slate-400' : 'text-emerald-700'}`}>{q.status === 'open' ? 'radio_button_unchecked' : 'check_circle'}</span><span>{q.name}</span></li>)}
              </ul>
            </details>
          ))}
        </>
      ) : (
        REQUIREMENTS.map((r) => (
          <details key={r.name} className="border-b border-slate-200 pb-3">
            <summary className="flex cursor-pointer items-end justify-between">
              <div className="text-base font-semibold">{r.name}</div>
              <div className="flex items-end gap-2 text-right text-sm"><div><b>{r.done} / {r.total}</b><div className="text-xs text-slate-500">{r.total - r.done} units remaining</div></div><span className="icon text-slate-500">expand_more</span></div>
            </summary>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-900" style={{ width: `${(r.done / r.total) * 100}%` }} /></div>
            <div className="mt-2 text-xs text-slate-500">Upload or paste a degree report on Program setup to see the requirements in this group.</div>
          </details>
        ))
      )}
      <div className="flex items-start gap-2">
        <span className="icon text-xl text-brand-900">lock</span>
        <div><div className="font-semibold">Must have</div><div className="text-xs text-slate-500">Candidates that break these conditions are rejected.</div></div>
      </div>
      <div className="space-y-3 rounded-xl border border-slate-300 bg-white p-3">
        <label className="block text-sm font-medium">Target units
          <input value={p.prefs.targetUnits || ''} onChange={(e) => set({ targetUnits: parseInt(e.target.value, 10) || 0 })} placeholder="e.g. 12" inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-brand-700" />
        </label>
        <div>
          <div className="text-sm font-medium">Only these days <span className="font-normal text-slate-500">(none selected = any)</span></div>
          <div className="mt-1 flex gap-1.5">
            {DAYS.map((d) => (
              <button key={d} onClick={() => toggleDay(d)} className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold ${p.prefs.days.includes(d) ? 'border-brand-900 bg-brand-900 text-white' : 'border-slate-300 hover:bg-slate-50'}`}>{d}</button>
            ))}
          </div>
        </div>
        <Toggle on={p.prefs.onlineOnly} onChange={(v) => set({ onlineOnly: v })} label="Online classes only" hint="Asynchronous or scheduled online" />
        <Toggle on={p.prefs.seatsOnly} onChange={(v) => set({ seatsOnly: v })} label="Seats available only" hint="Skip full sections" />
        <div className="text-xs text-slate-500">Current candidate meetings are checked immediately.</div>
      </div>
      <button onClick={p.onGenerate} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-900 py-3 text-sm font-semibold text-white hover:bg-brand-700">
        <span className="icon text-lg">auto_awesome</span>Generate proposed schedule
      </button>
      {!p.hasReport && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">No degree report loaded, so suggestions are not tied to your requirements. Paste one on Program setup.</div>}
      {p.note && <div className="rounded-lg bg-brand-100 p-3 text-xs text-brand-900">{p.note}</div>}
      {p.rec && (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-white p-3 text-sm">
          <div className="font-semibold">Why these classes · {p.rec.totalUnits} units</div>
          {p.rec.picks.map((x) => (
            <div key={cid(x.section)} className="rounded-lg bg-slate-50 p-2.5">
              <div className="font-semibold">{cid(x.section)} · {x.section.title}</div>
              <div className="mt-0.5 text-xs text-slate-500">For: {x.requirement}</div>
              <ul className="mt-1 list-disc pl-4 text-xs text-slate-700">{x.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          ))}
          {p.rec.notes.map((n) => <div key={n} className="text-xs text-slate-600">{n}</div>)}
          {p.rec.blockedInterests.length > 0 && (
            <div className="text-xs"><div className="font-semibold">Matches you can’t take yet</div>
              {p.rec.blockedInterests.map((b) => <div key={b.code} className="text-slate-600">{b.code} {b.title}: needs {b.needs}</div>)}</div>
          )}
          {p.rec.uncovered.length > 0 && (
            <details className="text-xs"><summary className="cursor-pointer font-semibold">Not covered this term ({p.rec.uncovered.length})</summary>
              <ul className="mt-1 space-y-1 text-slate-600">{p.rec.uncovered.map((u) => <li key={u.requirement}><b>{u.requirement}</b>: {u.why}</li>)}</ul></details>
          )}
          <div className="text-[11px] text-slate-400">Removed by your preferences: online {p.rec.filteredOut.online}, days {p.rec.filteredOut.days}, seats {p.rec.filteredOut.seats}, prerequisites {p.rec.filteredOut.prerequisites}. Days, modes and seats are sample data.</div>
        </div>
      )}
      <div className="flex items-start gap-2">
        <span className="icon text-xl text-brand-900">tune</span>
        <div><div className="font-semibold">Prioritize, in this order</div><div className="text-xs text-slate-500">Rank flexible priorities; trade-offs will cite schedule facts.</div></div>
      </div>
      <div className="space-y-3 rounded-xl border border-slate-300 bg-white p-3">
        <Toggle on={p.prefs.fast} onChange={(v) => set({ fast: v })} label="Graduate as soon as possible" hint="Favor courses that unlock the most remaining requirements" />
        <Toggle on={p.prefs.usePriorities !== false} onChange={(v) => set({ usePriorities: v })} label="Use the priority order below" hint="Turn off to ignore the ranking" />
      </div>
      <ul className={`space-y-2 ${p.prefs.usePriorities === false ? 'pointer-events-none opacity-40' : ''}`}>
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
