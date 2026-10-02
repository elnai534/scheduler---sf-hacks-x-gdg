import { useState } from 'react'
import { CATALOG, cid, conflictsWith, fmt } from '../data'
import type { Course } from '../data'

const meetingLine = (c: Course) => {
  if (!c.meetings.length) return 'No scheduled day or time'
  const m = c.meetings[0]
  const more = c.meetings.length > 1 ? ` · +${c.meetings.length - 1} more meeting` : ''
  return `${m.day} ${fmt(m.start).replace(' AM', '').replace(' PM', '')}–${fmt(m.end)}${more}`
}

export default function CoursesTab({ accepted, onToggle }: { accepted: Course[]; onToggle: (c: Course) => void }) {
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('Fall 2026')
  const [session, setSession] = useState('Academic Regular Session')
  const [open, setOpen] = useState(false)
  const [seatsOnly, setSeatsOnly] = useState(false)
  const [mode, setMode] = useState('')
  const [instructor, setInstructor] = useState('')
  const results = CATALOG.filter((c) =>
    (!q || `${c.code} ${c.title}`.toLowerCase().includes(q.toLowerCase())) &&
    (!seatsOnly || c.seats > 0) && (!mode || c.mode === mode) &&
    (!instructor || c.instructor.toLowerCase().includes(instructor.toLowerCase())),
  )
  const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-brand-700'
  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-2 rounded-lg border border-brand-200 bg-brand-100 p-3 text-xs text-brand-900">
        <span className="icon text-base">info</span>
        <span>Reference results from the {term} SF State class search{q && <> (searched “{q}”)</>}. Seats and waitlist counts are examples from one point in time, not current availability.</span>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-300 bg-white p-3">
        <label className="block text-sm font-medium">Term<input className={input} value={term} onChange={(e) => setTerm(e.target.value)} /></label>
        <label className="block text-sm font-medium">Session<input className={input} value={session} onChange={(e) => setSession(e.target.value)} /></label>
        <label className="block text-sm font-medium">Subject / course number<input className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. DES" /></label>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-semibold text-brand-900">
          <span className="icon text-base">tune</span>{open ? 'Hide' : 'Show'} seat, mode, time, and instructor filters
        </button>
        {open && (
          <div className="space-y-2 border-t border-slate-200 pt-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={seatsOnly} onChange={(e) => setSeatsOnly(e.target.checked)} />Seats available only</label>
            <label className="block text-sm font-medium">Instructor last name<input className={input} value={instructor} onChange={(e) => setInstructor(e.target.value)} /></label>
            <label className="block text-sm font-medium">Instruction mode
              <select className={input} value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="">Any</option><option>In person</option><option>Hybrid</option><option>Online asynchronous</option>
              </select>
            </label>
          </div>
        )}
      </div>
      {results.length === 0 && <div className="py-6 text-center text-sm text-slate-500">No classes match these filters.</div>}
      {results.map((c) => {
        const added = accepted.some((a) => cid(a) === cid(c))
        const clash = !added && conflictsWith(c, accepted)
        return (
          <div key={cid(c)} className="rounded-xl border border-slate-300 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="text-lg font-bold text-brand-900">{cid(c)}</div>
              <span className="rounded-full border border-brand-200 bg-brand-100 px-3 py-0.5 text-xs font-medium text-brand-900">{c.mode}</span>
            </div>
            <div className="mt-2 text-sm font-semibold">{c.title}</div>
            <div className="text-xs text-slate-500">{c.kind} · Class #{c.classNumber} · {c.units} units</div>
            <div className="mt-2 text-xs">{meetingLine(c)}</div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-600">{c.seats} seats · {c.waitlist} waitlist{clash && <b className="ml-2 text-red-700">Time conflict</b>}</span>
              <button onClick={() => onToggle(c)} className={`flex items-center gap-1 rounded-lg border px-4 py-1.5 text-xs font-semibold ${added ? 'border-slate-300 text-slate-500' : 'border-brand-900 text-brand-900 hover:bg-brand-100'}`}>
                <span className="icon text-base">{added ? 'check' : 'add'}</span>{added ? 'Added' : 'Add'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
