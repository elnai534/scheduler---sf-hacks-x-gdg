import { useState } from 'react'
import { CATALOG, SCHEDULABLE, cid, conflictsWith, fmt } from '../data'
import type { Course } from '../data'
import { completedCodes, inProgressCodes } from '../dpr/parse'
import type { DprReport } from '../dpr/types'
import { eligibility } from '../dag/graph'
import { LEVELS, isFiltered, matchesCourse, meetsTimeWindow, subjectOf } from '../lib/courseFilter'
import type { Level } from '../lib/courseFilter'

const meetingLine = (c: Course) => {
  if (c.mode === 'Catalog only') return 'Section times not in the catalog'
  if (!c.meetings.length) return 'No scheduled day or time'
  const m = c.meetings[0]
  const more = c.meetings.length > 1 ? ` · +${c.meetings.length - 1} more meeting` : ''
  return `${m.day} ${fmt(m.start).replace(' AM', '').replace(' PM', '')}–${fmt(m.end)}${more}`
}

export default function CoursesTab({ accepted, onToggle, report }: { accepted: Course[]; onToggle: (c: Course) => void; report: DprReport | null }) {
  const done = report ? completedCodes(report) : null
  const doing = report ? inProgressCodes(report) : null
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [session, setSession] = useState('')
  const [open, setOpen] = useState(false)
  const [seatsOnly, setSeatsOnly] = useState(false)
  const [mode, setMode] = useState('')
  const [instructor, setInstructor] = useState('')
  const [level, setLevel] = useState<Level | ''>('')
  const [subject, setSubject] = useState('')
  const [limit, setLimit] = useState(30)
  const [location, setLocation] = useState('')
  const [after, setAfter] = useState('')
  const [before, setBefore] = useState('')
  const [attr1, setAttr1] = useState('')
  const [attr2, setAttr2] = useState('')
  const pool = [...SCHEDULABLE, ...CATALOG.filter((c) => c.mode === 'Catalog only')]
  const subjects = [...new Set(pool.map((c) => subjectOf(c.code)))].sort()
  const f = { q, level, subject }
  const reset = () => { setQ(''); setLevel(''); setSubject(''); setSeatsOnly(false); setMode(''); setInstructor(''); setLocation(''); setAfter(''); setBefore(''); setAttr1(''); setAttr2(''); setLimit(30) }
  const matches = pool.filter((c) =>
    matchesCourse(c, f) &&
    (!seatsOnly || c.seats > 0) && (!mode || c.mode === mode) &&
    (!instructor || c.instructor.toLowerCase().includes(instructor.toLowerCase())) &&
    (!location || c.meetings.some((m) => m.location.toLowerCase().includes(location.toLowerCase()))) &&
    meetsTimeWindow(c.meetings, after, before),
  )
  const results = matches.slice(0, limit)
  const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-brand-700'
  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-2 rounded-lg border border-brand-200 bg-brand-100 p-3 text-xs text-brand-900">
        <span className="icon text-base">info</span>
        <span>Reference results from the {term ? `${term} ` : ''}SF State class search{q && <> (searched “{q}”)</>}. Seats and waitlist counts are examples from one point in time, not current availability.</span>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-300 bg-white p-3">
        <label className="block text-sm font-medium">Term<select className={input} value={term} onChange={(e) => setTerm(e.target.value)}><option value="">Select…</option><option>Fall 2026</option><option>Spring 2027</option></select></label>
        <label className="block text-sm font-medium">Session<select className={input} value={session} onChange={(e) => setSession(e.target.value)}><option value="">Select…</option><option>Academic Regular Session</option><option>Winter Session</option></select></label>
        <label className="block text-sm font-medium">Subject / course number<input className={input} value={q} onChange={(e) => { setQ(e.target.value); setLimit(30) }} placeholder="e.g. DES or DES 200" /></label>
        <div className="grid grid-cols-2 gap-2 text-sm font-medium">
          <label>Level<select className={input} value={level} onChange={(e) => { setLevel(e.target.value as Level | ''); setLimit(30) }}><option value="">All levels</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
          <label>Department<select className={input} value={subject} onChange={(e) => { setSubject(e.target.value); setLimit(30) }}><option value="">All</option>{subjects.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-semibold text-brand-900">
          <span className="icon text-base">tune</span>{open ? 'Hide' : 'Show'} seat, mode, time, and instructor filters
        </button>
        {open && (
          <div className="space-y-2 border-t border-slate-200 pt-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={seatsOnly} onChange={(e) => setSeatsOnly(e.target.checked)} />Seats available only</label>
            <label className="block text-sm font-medium">Instructor last name<input className={input} value={instructor} onChange={(e) => setInstructor(e.target.value)} /></label>
            <label className="block text-sm font-medium">Location<input className={input} placeholder="e.g. Fine Arts Building" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
            <div className="grid grid-cols-2 gap-2 text-sm font-medium">
              <label>Begins at/after<input type="time" className={input} value={after} onChange={(e) => setAfter(e.target.value)} /></label>
              <label>Ends at/before<input type="time" className={input} value={before} onChange={(e) => setBefore(e.target.value)} /></label>
            </div>
            <label className="block text-sm font-medium">Course attribute<input className={input} value={attr1} onChange={(e) => setAttr1(e.target.value)} /></label>
            <label className="block text-sm font-medium">Second course attribute<input className={input} value={attr2} onChange={(e) => setAttr2(e.target.value)} /></label>
            <div className="text-sm font-medium">Instruction mode</div>
            {['In person', 'Hybrid', 'Online asynchronous', 'Online synchronous'].map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mode === m} onChange={() => setMode(mode === m ? '' : m)} />{m}</label>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{matches.length} of {pool.length} classes from the SF State bulletin{matches.length > limit ? ` · showing ${limit}` : ''}</span>
        {(isFiltered(f) || seatsOnly || mode || instructor || location || after || before || attr1 || attr2) && <button onClick={reset} className="flex items-center gap-1 font-semibold text-brand-900"><span className="icon text-base">filter_alt_off</span>Clear filters</button>}
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
            <div className="text-xs text-slate-500">{c.kind} · {c.classNumber ? `Class #${c.classNumber}` : 'Catalog entry'} · {c.units} units</div>
            <div className="mt-2 text-xs">{meetingLine(c)}</div>
            {done && doing && (() => {
              const e = eligibility(c.node, new Set([...done, ...doing]), doing) // in-progress courses are assumed to finish
              const have = doing.has(c.code) || done.has(c.code)
              return have ? <div className="mt-1 text-xs font-semibold text-slate-500">Already on your report</div>
                : e.ok ? <div className="mt-1 text-xs font-semibold text-emerald-700">Prerequisites met{e.needsHumanCheck ? ' · check restrictions' : ''}</div>
                : <div className="mt-1 text-xs font-semibold text-amber-800">Needs: {e.unmet.map((g) => g.join(' or ')).join('; ')}</div>
            })()}
            {c.prereqText && <div className="mt-1 line-clamp-2 text-xs text-slate-500">Prerequisites: {c.prereqText}</div>}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-600">{c.mode === 'Catalog only' ? 'No seat data' : `${c.seats} seats · ${c.waitlist} waitlist`}{clash && <b className="ml-2 text-red-700">Time conflict</b>}</span>
              <button onClick={() => onToggle(c)} title={added ? 'Click to remove from schedule' : undefined} className={`group flex items-center gap-1 rounded-lg border px-4 py-1.5 text-xs font-semibold ${added ? 'border-slate-300 text-slate-500 hover:border-red-300 hover:text-red-700' : 'border-brand-900 text-brand-900 hover:bg-brand-100'}`}>
                <span className={`icon text-base ${added ? 'group-hover:hidden' : ''}`}>{added ? 'check' : 'add'}</span>{added && <span className="icon hidden text-base group-hover:inline">close</span>}<span className={added ? 'group-hover:hidden' : ''}>{added ? 'Added' : 'Add'}</span>{added && <span className="hidden group-hover:inline">Remove</span>}
              </button>
            </div>
          </div>
        )
      })}
      {matches.length > limit && <button onClick={() => setLimit(limit + 30)} className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-brand-900">Show more</button>}
    </div>
  )
}
