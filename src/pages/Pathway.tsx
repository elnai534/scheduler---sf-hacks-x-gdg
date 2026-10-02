import { useState } from 'react'

const PATHS = [
  { id: 'Undergraduate', icon: 'school', desc: 'Plan an upcoming semester using your program and degree progress.' },
  { id: 'Graduate', icon: 'domain', desc: 'Graduate pathway is represented, but its downstream steps are not defined in this version.' },
  { id: 'New student', icon: 'apartment', desc: 'New-student pathway is represented without inventing an advising or enrollment flow.' },
  { id: 'Transfer student', icon: 'work', desc: 'Choose a documented transfer origin before continuing. Exact options require the supplied journey-map reference.' },
]

export default function Pathway({ onNext }: { onNext: () => void }) {
  const [path, setPath] = useState('')
  const [enrolled, setEnrolled] = useState('')
  const ok = path === 'Undergraduate' && enrolled === 'current'
  return (
    <div className="mx-auto max-w-[1240px] px-12 py-10">
      <div className="text-sm font-semibold text-brand-900">Step 1 of 4 · Program setup</div>
      <h1 className="mt-2 text-3xl font-bold">Which student pathway fits you?</h1>
      <p className="mt-3 max-w-3xl text-slate-600">Your answer changes the information needed for planning. This prototype focuses on current undergraduate students; other mapped pathways are visible without invented steps.</p>
      <div className="mt-8 grid grid-cols-4 gap-4">
        {PATHS.map((p) => {
          const on = path === p.id
          return (
            <button key={p.id} onClick={() => setPath(p.id)} className={`flex min-h-60 flex-col justify-end rounded-2xl border-2 p-6 text-left ${on ? 'border-brand-900 bg-brand-100' : 'border-slate-200 bg-white hover:border-brand-200'}`}>
              <div className={`mb-auto grid size-10 place-items-center rounded-lg ${on ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-700'}`}><span className="icon text-xl">{p.icon}</span></div>
              <div className="mt-6 text-lg font-bold">{p.id}</div>
              <div className="mt-2 text-sm leading-relaxed text-slate-600">{p.desc}</div>
            </button>
          )
        })}
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="font-bold">Are you currently enrolled at SF State?</div>
        <div className="mt-4 flex gap-3">
          {[['current', 'Current student'], ['not', 'Not currently enrolled']].map(([v, l]) => (
            <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${enrolled === v ? 'border-brand-900 bg-brand-100' : 'border-slate-300'}`}>
              <input type="radio" name="status" checked={enrolled === v} onChange={() => setEnrolled(v)} />{l}
            </label>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-end gap-4">
        {!ok && <span className="text-sm text-slate-500">Only current undergraduates are supported in this prototype.</span>}
        <button disabled={!ok} onClick={onNext} className="flex items-center gap-2 rounded-lg bg-brand-900 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">
          Continue as current undergraduate <span className="icon text-lg">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
