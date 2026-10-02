import { useState } from 'react'
import { parseDpr } from '../dpr/parse'
import sampleDpr from '../dpr/fixtures/sample-dpr.txt?raw'
import type { DprReport } from '../dpr/types'

export interface Program { career: string; degree: string; major: string; minor: string }

const sel = 'mt-2 w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-sm font-normal outline-brand-700'

export default function Setup({ program, setProgram, onNext, onBack, onReport }: { program: Program; setProgram: (p: Program) => void; onNext: () => void; onBack: () => void; onReport: (r: DprReport) => void }) {
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const submit = (raw: string) => {
    const r = parseDpr(raw)
    if (!r.requirements.length) { setErr('No requirements found. Copy the whole Degree Progress Report page (expand all sections first) and paste it here.'); return }
    setErr('')
    onReport(r)
    onNext()
  }
  const set = (k: keyof Program) => (e: React.ChangeEvent<HTMLSelectElement>) => setProgram({ ...program, [k]: e.target.value })
  return (
    <div className="mx-auto max-w-[1240px] px-12 py-10">
      <div className="text-sm font-semibold text-brand-900">Step 2 of 4 · Program setup</div>
      <h1 className="mt-2 text-3xl font-bold">Confirm your academic program</h1>
      <p className="mt-3 max-w-3xl text-slate-600">Start with the program you declare. A Degree Progress Report (DPR) can add course and requirement evidence, but it is optional.</p>
      <div className="mt-8 grid grid-cols-[1.15fr_1fr] gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Program information</h2>
          <p className="mt-1 text-sm text-slate-600">This manual information is student entered and will not be presented as a verified degree audit.</p>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm font-semibold">
            <label>Academic career<select className={sel} value={program.career} onChange={set('career')}><option>Undergraduate</option></select></label>
            <label>Program<select className={sel} value={program.degree} onChange={set('degree')}><option>Bachelor of Science</option><option>Bachelor of Arts</option></select></label>
            <label>Declared major<select className={sel} value={program.major} onChange={set('major')}><option>Visual Communication Design</option><option>Industrial Design</option><option>Computer Science</option></select></label>
            <label>Minor <span className="font-normal text-slate-500">Optional</span><select className={sel} value={program.minor} onChange={set('minor')}><option>None declared</option><option>Computer Science</option><option>Biology</option></select></label>
          </div>
          <div className="mt-5 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><span className="icon text-lg">info</span>If a DPR is successfully extracted, you will confirm its values instead of re-entering them.</div>
        </section>
        <div>
          <section className="rounded-2xl border border-dashed border-violet-400 bg-slate-100 p-5">
            <div className="flex items-start gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-brand-900"><span className="icon text-xl">cloud_upload</span></div>
              <div className="flex-1"><div className="font-bold">Paste your Degree Progress Report (DPR)</div>
                <p className="mt-1 text-sm text-slate-600">Optional. Open your report, click “Expand All”, “View All” on long lists, then copy and paste the page text. Your name and student ID are never read or stored.</p></div>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste report text here…" className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 text-xs outline-brand-700" />
            {err && <div className="mt-2 text-sm text-red-700">{err}</div>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => submit(text)} disabled={!text.trim()} className="rounded-lg border border-brand-900 bg-white px-4 py-2 text-sm font-semibold text-brand-900 disabled:opacity-40">Read report</button>
              <button onClick={() => submit(sampleDpr)} className="px-3 py-2 text-sm font-semibold text-brand-900 underline">Use sample report</button>
            </div>
          </section>
          <div className="my-3 flex items-center gap-3 text-xs font-semibold text-slate-500"><div className="h-px flex-1 bg-slate-300" />OR<div className="h-px flex-1 bg-slate-300" /></div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="font-bold">Continue without a report</div>
            <p className="mt-2 text-sm text-slate-600">You can schedule from your declared program and add courses manually. Academic eligibility and remaining requirements will remain unverified.</p>
            <button onClick={onNext} className="mt-4 flex items-center gap-2 rounded-lg border border-brand-900 px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-100">Use manual information<span className="icon text-lg">arrow_forward</span></button>
          </section>
        </div>
      </div>
      <button onClick={onBack} className="mt-6 flex items-center gap-2 px-4 py-2 text-sm font-semibold"><span className="icon text-lg">arrow_back</span>Back</button>
    </div>
  )
}
