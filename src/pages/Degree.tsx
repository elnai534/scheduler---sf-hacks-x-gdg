import { openRequirements } from '../dpr/parse'
import type { DprReport } from '../dpr/types'
import type { Course } from '../data'
import MissingCourses from '../components/MissingCourses'
import { useState } from 'react'
import { applyChange, DEGREES, MAJORS, MINORS, degreeEnabled, majorEnabled, minorEnabled } from '../programRules'
import type { Program } from './Setup'

const sel = 'mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-normal outline-brand-700'

const ICONS = [['check_circle', 'Completed', 'text-emerald-700'], ['schedule', 'In progress', 'text-brand-900'], ['menu_book', 'Remaining', 'text-slate-700']] as const

export default function Degree({ program, setProgram, report, accepted, onToggle, onNext }: { program: Program; setProgram: (p: Program) => void; report: DprReport | null; accepted: Course[]; onToggle: (c: Course) => void; onNext: () => void }) {
  const [editing, setEditing] = useState(false)
  const set = (k: keyof Program) => (e: React.ChangeEvent<HTMLSelectElement>) => setProgram(applyChange(program, k, e.target.value))
  const counts = report
    ? [
        report.courses.filter((c) => c.status === 'completed' || c.status === 'transfer'),
        report.courses.filter((c) => c.status === 'inProgress'),
        openRequirements(report).map((q) => ({ code: q.name, title: '' })),
      ]
    : [[], [], []]
  const open = report ? openRequirements(report) : []
  const sections = [...new Set(open.map((q) => q.section))]
  const title = report ? report.plans.map((p) => p.replace(/-(BS|BA|MN)$/, (m) => (m === '-MN' ? ' (minor)' : m === '-BS' ? ', B.S.' : ', B.A.'))).join(' · ') : [program.major || 'Program not selected', program.degree === 'Bachelor of Arts' ? 'B.A.' : program.degree ? 'B.S.' : ''].filter(Boolean).join(', ')
  return (
    <div className="mx-auto max-w-[1240px] px-12 py-10">
      <div className="text-sm font-semibold text-brand-900">Degree overview</div>
      <h1 className="mt-2 text-3xl font-bold">What we know before you schedule</h1>
      <p className="mt-3 max-w-3xl text-slate-600">Use this overview to recognize relevant requirements while planning. Open a requirement group for course-level evidence; you will not need to remember it in the scheduler.</p>
      <div className="mt-5 grid grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between"><h2 className="text-xl font-bold">{title}</h2></div>
            <div className="mt-2 text-sm text-slate-600">{report ? `${report.career} · ${report.program} · Current term ${report.lastTerm}` : `${program.career || 'Career not selected'} · ${program.minor ? `Minor: ${program.minor}` : 'No minor declared'}`}</div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm">
              <span className="text-slate-600">{[program.major, program.degree, program.minor && `Minor: ${program.minor}`].filter(Boolean).join(' · ') || 'No program entered manually'}</span>
              <button onClick={() => setEditing(!editing)} className="flex items-center gap-1 font-semibold text-brand-900"><span className="icon text-base">edit</span>{editing ? 'Done' : 'Edit program'}</button>
            </div>
            {editing && (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm font-semibold text-slate-800">
                <label>Academic career<select className={sel} value={program.career} onChange={set('career')}><option value="" disabled>Select…</option><option>Undergraduate</option></select></label>
                <label>Program<select className={sel} value={program.degree} onChange={set('degree')}><option value="" disabled>Select…</option>{DEGREES.map((o) => <option key={o} disabled={!degreeEnabled(program, o)}>{o}</option>)}</select></label>
                <label>Declared major<select className={sel} value={program.major} onChange={set('major')}><option value="" disabled>Select…</option>{MAJORS.map((o) => <option key={o} disabled={!majorEnabled(program, o)}>{o}</option>)}</select></label>
                <label>Minor <span className="font-normal text-slate-500">Optional</span><select className={sel} value={program.minor} onChange={set('minor')}><option value="">None declared</option>{MINORS.map((o) => <option key={o} disabled={!minorEnabled(program, o)}>{o}</option>)}</select></label>
              </div>
            )}
          </section>
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-bold">Requirement progress</h2><div className="mt-1 text-sm text-slate-600">In-progress and planned courses remain separate from completed work.</div></div>
            {!report && (
              <div className="px-6 py-8 text-center"><span className="icon text-3xl text-amber-700">warning</span>
                <div className="mt-2 font-bold">Requirement details are not verified</div>
                <div className="mx-auto mt-1 max-w-md text-sm text-slate-600">Paste a degree report or verify requirements with an academic advisor before treating this overview as complete.</div></div>
            )}
            {report && sections.map((sec) => (
              <details key={sec} className="border-b border-slate-100 px-5 py-3 last:border-0" open={sections.length === 1}>
                <summary className="flex cursor-pointer items-center justify-between font-semibold">{sec || 'Requirements'}<span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs text-red-700">{open.filter((q) => q.section === sec).length} remaining</span></summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {open.filter((q) => q.section === sec).map((q) => (
                    <li key={q.id}>{report && <MissingCourses req={q} report={report} accepted={accepted} onToggle={onToggle} />}</li>
                  ))}
                </ul>
              </details>
            ))}
          </section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Course status</h2>
            <ul className="mt-4 space-y-3">{ICONS.map(([ic, l, c], i) => (
              <li key={l} title={counts[i].map((c) => `${c.code} ${c.title}`.trim()).join("\n") || "None yet"} className="flex items-center gap-3"><span className={`icon grid size-8 place-items-center rounded-lg bg-slate-100 text-lg ${c}`}>{ic}</span><span className="flex-1 text-sm font-medium">{l}</span><b>{counts[i].length}</b></li>))}</ul>
          </section>
          <button onClick={onNext} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-900 py-3 text-sm font-semibold text-white hover:bg-brand-700">Continue to Schedule<span className="icon text-lg">arrow_forward</span></button>
        </aside>
      </div>
    </div>
  )
}
