import { useState } from 'react'
import Calendar from '../components/Calendar'
import CoursesTab from '../components/CoursesTab'
import GeminiTab from '../components/GeminiTab'
import PlanTab from '../components/PlanTab'
import { cid, countConflicts, range } from '../data'
import { DEFAULT_PREFS } from '../recommend/recommend'
import type { Prefs, Recommendation } from '../recommend/recommend'
import type { Course } from '../data'
import type { DprReport } from '../dpr/types'

type Tab = 'plan' | 'courses' | 'gemini'
const TABS: { id: Tab; label: string }[] = [{ id: 'plan', label: 'Plan' }, { id: 'courses', label: 'Courses' }, { id: 'gemini', label: 'Ask Gemini' }]

interface Props {
  initialTab: Tab
  report: DprReport | null
  accepted: Course[]
  onToggle: (c: Course) => void
  onApply: (add: Course[], remove: string[]) => void
  onGenerate: (prefs: Prefs) => Recommendation | string
  onReview: () => void
  priorities: string[]; setPriorities: (p: string[]) => void
}

export default function Build(p: Props) {
  const [tab, setTab] = useState<Tab>(p.initialTab)
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [rec, setRec] = useState<Recommendation | null>(null)
  const units = p.accepted.reduce((n, c) => n + c.units, 0)
  const blocking = countConflicts(p.accepted)
  const timed = p.accepted.filter((c) => c.meetings.length)
  const untimed = p.accepted.filter((c) => !c.meetings.length)
  const sel = p.accepted.find((c) => cid(c) === selected)

  return (
    <div className="px-5 pb-6 pt-4">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs font-medium text-brand-900">Fall 2026 · Academic Regular Session</div>
          <h1 className="text-2xl font-bold">Build your semester schedule</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs">Accepted schedule</span>
          <div className="border-l border-slate-300 pl-4"><b className="text-lg">{units} units</b> <span className="text-xs text-slate-500">{blocking} blocking</span></div>
          <button onClick={p.onReview} className="flex items-center gap-2 rounded-lg bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Review &amp; export<span className="icon text-lg">chevron_right</span></button>
        </div>
      </div>
      <div className="grid grid-cols-[430px_1fr] overflow-hidden rounded-2xl border border-slate-300 bg-white">
        <section className="flex h-[calc(100vh-190px)] min-h-[560px] flex-col border-r border-slate-300 bg-paper/40">
          <div className="grid grid-cols-3 border-b border-slate-300 bg-white">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`m-1 rounded-lg py-2 text-sm font-medium ${tab === t.id ? 'bg-brand-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{t.label}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {tab === 'plan' && <PlanTab prefs={prefs} setPrefs={setPrefs} priorities={p.priorities} setPriorities={p.setPriorities} hasReport={Boolean(p.report)} rec={rec} note={note}
              onGenerate={() => { const r = p.onGenerate(prefs); if (typeof r === 'string') { setNote(r); setRec(null) } else { setNote(''); setRec(r) } }} />}
            {tab === 'courses' && <CoursesTab accepted={p.accepted} onToggle={p.onToggle} report={p.report} />}
            {tab === 'gemini' && <GeminiTab accepted={p.accepted} onApply={p.onApply} />}
          </div>
        </section>
        <section className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold"><span className="icon text-2xl text-brand-900">event_available</span>Accepted schedule</h2>
              <p className="mt-1 text-xs text-slate-500">Only applied sections appear here and in PDF export. Select a class block for details.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${blocking ? 'border-yellow-300 bg-yellow-100 text-yellow-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
              {blocking ? `${blocking} conflict${blocking > 1 ? 's' : ''}` : 'No conflicts'}
            </span>
          </div>
          <div className="mt-4"><Calendar courses={timed} selected={selected} onSelect={setSelected} /></div>
          {sel && (
            <div className="mt-3 rounded-xl border border-brand-200 bg-brand-100 p-4 text-sm">
              <div className="font-bold">{cid(sel)} · {sel.title}</div>
              <div className="text-xs text-slate-600">Class #{sel.classNumber} · {sel.units} units · {sel.instructor} · {sel.seats} seats</div>
              <div className="mt-1 text-xs">{sel.meetings.map((m) => `${m.day} ${range(m.start, m.end)} (${m.location})`).join(' · ')}</div>
              {sel.permission && <div className="mt-1 text-xs text-amber-800">Permission number required</div>}
              <button onClick={() => { p.onToggle(sel); setSelected(null) }} className="mt-2 text-xs font-semibold text-red-700">Remove from schedule</button>
            </div>
          )}
          <div className="mt-5">
            <div>
              <h3 className="mb-2 text-sm font-bold">Untimed and asynchronous</h3>
              {untimed.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">None added.</div>}
              {untimed.map((c) => (
                <div key={cid(c)} className="mb-2 flex items-center gap-3 rounded-lg border border-slate-300 bg-white p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-900"><span className="icon text-xl">desktop_windows</span></div>
                  <div className="flex-1"><div className="text-sm font-semibold">{cid(c)} · {c.title}</div><div className="text-xs text-slate-500">{c.mode === 'Catalog only' ? 'Catalog entry · section times unavailable' : 'No scheduled day or time · Online'}{c.permission && ' · Permission number required'}</div></div>
                  <span className="rounded-full border border-brand-200 bg-brand-100 px-3 py-0.5 text-xs font-medium text-brand-900">{c.mode}</span>
                  <button onClick={() => p.onToggle(c)} className="icon text-slate-400 hover:text-red-700" title="Remove">close</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
