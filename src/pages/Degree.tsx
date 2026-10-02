import { openRequirements } from '../dpr/parse'
import type { DprReport } from '../dpr/types'
import type { Course } from '../data'
import { UPPER_DIVISION_UNITS, requirementSections } from '../lib/requirementGroups'
import type { Overrides } from '../lib/overrides'
import type { ReqItem } from '../lib/requirementGroups'
import type { Layout } from '../lib/layout'
import { useState } from 'react'
import MissingCourses from '../components/MissingCourses'
import type { Program } from './Setup'

const ICONS = [['check_circle', 'Completed', 'text-emerald-700'], ['schedule', 'In progress', 'text-brand-900'], ['menu_book', 'Remaining', 'text-slate-700']] as const

export default function Degree({ program, report, rawReport, overrides, layout, setLayout, onOverride, accepted, onToggle, onNext }: { program: Program; report: DprReport | null; rawReport: DprReport | null; overrides: Overrides; layout: Layout; setLayout: (l: Layout) => void; onOverride: (reqId: string, reportStatus: string, want: 'filled' | 'open') => void; accepted: Course[]; onToggle: (c: Course) => void; onNext: () => void }) {
  const counts = report
    ? [
        report.courses.filter((c) => c.status === 'completed' || c.status === 'transfer'),
        report.courses.filter((c) => c.status === 'inProgress'),
        openRequirements(report).filter((q) => !UPPER_DIVISION_UNITS.test(q.name)).map((q) => ({ code: q.name, title: '' })),
      ]
    : [[], [], []]
  const [editingSec, setEditingSec] = useState<string | null>(null)
  const sections = report ? requirementSections(report, overrides) : []
  const [draft, setDraft] = useState('')
  const change = (patch: Partial<Layout>) => setLayout({ ...layout, ...patch })
  const removeItem = (key: string) => change({ removed: [...layout.removed, key], custom: layout.custom.filter((c) => c.key !== key) })
  const moveItem = (key: string, to: string, from: string) => change({ moved: { ...layout.moved, [key]: to }, order: { ...layout.order, [from]: (layout.order[from] ?? []).filter((k) => k !== key) } })
  const shuffle = (sec: string, keys: string[], idx: number, dir: -1 | 1) => {
    const next = [...keys]; const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    change({ order: { ...layout.order, [sec]: next } })
  }
  const addItem = (sec: string) => {
    const label = draft.trim()
    if (!label) return
    change({ custom: [...layout.custom, { key: `custom-${Date.now()}`, label, section: sec }] })
    setDraft('')
  }
  const reportStatus = (id: string) => rawReport?.requirements.find((q) => q.id === id)?.status ?? 'unknown'
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
          </section>
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-bold">Requirement progress</h2>
              <div className="mt-1 text-sm text-slate-600">Filled in from your degree progress report. Open a section to see its requirements, and use Edit to override one by hand.</div>
            </div>
            {!report && (
              <div className="px-6 py-8 text-center"><span className="icon text-3xl text-amber-700">warning</span>
                <div className="mt-2 font-bold">Requirement details are not verified</div>
                <div className="mx-auto mt-1 max-w-md text-sm text-slate-600">Paste a degree report or verify requirements with an academic advisor before treating this overview as complete.</div></div>
            )}
            {report && sections.map((sec) => {
              const editing = editingSec === sec.name
              const row = (i: ReqItem) => {
                const done = i.status === 'filled'
                const keys = sec.items.map((x) => x.key)
                const idx = keys.indexOf(i.key)
                return editing ? (
                  <li key={i.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <input type="checkbox" checked={done} title="Done" onChange={() => onOverride(i.reqId, reportStatus(i.reqId), done ? 'open' : 'filled')} className="size-4 shrink-0 accent-[#2d1b69]" />
                    <span className="min-w-0 flex-1">{i.label}{i.custom && <span className="ml-1 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-900">Added</span>}</span>
                    <button onClick={() => shuffle(sec.name, keys, idx, -1)} disabled={idx === 0} title="Move up" className="icon text-base text-slate-500 disabled:opacity-30">arrow_upward</button>
                    <button onClick={() => shuffle(sec.name, keys, idx, 1)} disabled={idx === keys.length - 1} title="Move down" className="icon text-base text-slate-500 disabled:opacity-30">arrow_downward</button>
                    <select value="" onChange={(e) => e.target.value && moveItem(i.key, e.target.value, sec.name)} title="Move to another section" className="w-24 rounded border border-slate-300 bg-white px-1 py-0.5 text-[11px]"><option value="">Move to…</option>{sections.filter((x) => x.name !== sec.name).map((x) => <option key={x.name}>{x.name}</option>)}</select>
                    <button onClick={() => removeItem(i.key)} title="Remove" className="icon text-base text-red-700">close</button>
                  </li>
                ) : (
                  <li key={i.key}>
                    {i.req ? <MissingCourses req={i.req} report={report} accepted={accepted} onToggle={onToggle} />
                      : <div className="flex items-center gap-1.5 text-xs"><span className={`icon text-sm ${done ? 'text-emerald-700' : 'text-slate-400'}`}>{done ? 'check_circle' : 'radio_button_unchecked'}</span><span>{i.label}</span>{i.manual && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Manual</span>}</div>}
                  </li>
                )
              }
              const subs = (['Lower Division', 'Upper Division'] as const).filter((d) => sec.items.some((i) => i.sub === d))
              return (
                <details key={sec.name} className="group border-b border-slate-100 px-5 py-3 last:border-0" open={sections.length === 1}>
                  <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold">
                    <span className="flex items-center gap-1"><span className="icon text-lg transition-transform group-open:rotate-180">expand_more</span>{sec.name}</span>
                    <span className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs ${sec.items.length - sec.done ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{sec.items.length - sec.done} remaining</span>
                      <button onClick={(e) => { e.preventDefault(); setEditingSec(editing ? null : sec.name); e.currentTarget.closest('details')?.setAttribute('open', '') }} className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-brand-900 hover:bg-brand-100"><span className="icon text-sm">edit</span>{editing ? 'Done' : 'Edit'}</button>
                    </span>
                  </summary>
                  {editing && (
                    <div className="mt-2 space-y-2 text-xs text-slate-500">
                      <div>Everything here came from your report. Tick to mark done, use the arrows and Move to… to rearrange, × to remove, or add your own below.</div>
                      <div className="flex gap-2"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem(sec.name)} placeholder="Add a requirement" className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 outline-brand-700" /><button onClick={() => addItem(sec.name)} className="rounded-lg bg-brand-900 px-3 py-1.5 font-semibold text-white">Add</button></div>
                      {layout.removed.length > 0 && <button onClick={() => change({ removed: [] })} className="font-semibold text-brand-900 underline">Restore {layout.removed.length} removed</button>}
                    </div>
                  )}
                  {subs.length
                    ? subs.map((d) => <div key={d} className="mt-3"><div className="text-xs font-semibold text-slate-700">{d}</div><ul className="mt-1 space-y-2">{sec.items.filter((i) => i.sub === d).map(row)}</ul></div>)
                    : <ul className="mt-3 space-y-2 text-sm">{sec.items.map(row)}</ul>}
                </details>
              )
            })}
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
