import { useState } from 'react'
import { parseDpr } from '../dpr/parse'
import { pdfToText } from '../dpr/pdf'
import type { DprReport } from '../dpr/types'
import { applyChange, DEGREES, MAJORS, MINORS, degreeEnabled, majorEnabled, minorEnabled } from '../programRules'

export interface Program { career: string; degree: string; major: string; minor: string }

const sel = 'mt-2 w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-sm font-normal outline-brand-700'

export default function Setup({ program, setProgram, onNext, onBack, onReport }: { program: Program; setProgram: (p: Program) => void; onNext: () => void; onBack: () => void; onReport: (r: DprReport) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = (raw: string) => {
    const r = parseDpr(raw)
    if (!r.requirements.length) { setErr('No requirements found. Upload the full Degree Progress Report PDF (expand all sections before saving it as a PDF).'); return }
    setErr('')
    onReport(r)
    onNext()
  }
  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try { submit(await pdfToText(file)) } catch { setErr('Could not read that PDF. Upload your Degree Progress Report as a PDF file.') } finally { setBusy(false) }
  }
  const set = (k: keyof Program) => (e: React.ChangeEvent<HTMLSelectElement>) => setProgram(applyChange(program, k, e.target.value))
  return (
    <div className="mx-auto max-w-[1240px] px-12 py-8">
      <div className="text-sm font-semibold text-brand-900">Step 2 of 4 · Program setup</div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Degree Progress Report</h1>
      <p className="mt-4 max-w-3xl text-base text-slate-600">Upload or enter your academic progress so we can determine what course requirements you still need to meet.</p>
      <div className="mt-8 grid grid-cols-[1fr_auto_1.11fr] items-stretch gap-6">
        <section className="flex min-h-[376px] flex-col rounded-xl border border-violet-300 bg-brand-100/50 p-6">
          <h2 className="text-lg font-bold text-slate-900">Continue Automatically</h2>
          <div className="my-auto flex items-start gap-6 px-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-brand-900 shadow-sm"><span className="icon text-xl">cloud_upload</span></div>
            <div><div className="font-bold">Upload your Degree Progress Report (DPR)</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">Optional. Upload a PDF to prefill program and requirement information. You will review all extracted values before they are used.</p></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <label className="flex h-10 cursor-pointer items-center rounded-lg border border-violet-300 bg-white px-4 text-sm hover:bg-slate-50">
              {busy ? 'Reading PDF…' : 'Upload PDF'}
              <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            {err && <div className="text-sm text-red-700">{err}</div>}
          </div>
        </section>
        <div className="flex flex-col items-center py-2 text-xs font-semibold text-slate-400"><div className="w-px flex-1 bg-slate-300" /><span className="py-3">OR</span><div className="w-px flex-1 bg-slate-300" /></div>
        <section className="flex flex-col rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Enter Degree Progress Manually</h2>
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-4 text-sm font-semibold text-slate-800">
            <label>Academic career<select className={sel} value={program.career} onChange={set('career')}><option value="" disabled>Select…</option><option>Undergraduate</option></select></label>
            <label>Program<select className={sel} value={program.degree} onChange={set('degree')}><option value="" disabled>Select…</option>{DEGREES.map((o) => <option key={o} disabled={!degreeEnabled(program, o)}>{o}</option>)}</select></label>
            <label>Declared major<select className={sel} value={program.major} onChange={set('major')}><option value="" disabled>Select…</option>{MAJORS.map((o) => <option key={o} disabled={!majorEnabled(program, o)}>{o}</option>)}</select></label>
            <label>Minor <span className="font-normal text-slate-500">Optional</span><select className={sel} value={program.minor} onChange={set('minor')}><option value="">None declared</option>{MINORS.map((o) => <option key={o} disabled={!minorEnabled(program, o)}>{o}</option>)}</select></label>
          </div>
          <button onClick={onNext} className="mx-auto mt-10 flex h-10 w-[210px] items-center justify-center gap-2 rounded-lg border border-violet-300 bg-white text-sm font-semibold text-brand-900 hover:bg-brand-100">Continue Manually<span className="icon text-base">arrow_forward</span></button>
        </section>
      </div>
      <button onClick={onBack} className="mt-6 flex items-center gap-2 px-4 py-2 text-sm font-semibold"><span className="icon text-lg">arrow_back</span>Back</button>
    </div>
  )
}
