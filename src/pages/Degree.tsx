import type { Program } from './Setup'

const STATUS = [['check_circle', 'Completed', 2, 'text-emerald-700'], ['schedule', 'In progress', 1, 'text-brand-900'], ['checklist', 'Planned', 1, 'text-blue-700'], ['menu_book', 'Remaining', 4, 'text-slate-700']] as const

export default function Degree({ program, onNext, onBrowse }: { program: Program; onNext: () => void; onBrowse: () => void }) {
  return (
    <div className="mx-auto max-w-[1240px] px-12 py-10">
      <div className="text-sm font-semibold text-brand-900">Degree overview</div>
      <h1 className="mt-2 text-3xl font-bold">What we know before you schedule</h1>
      <p className="mt-3 max-w-3xl text-slate-600">Use this overview to recognize relevant requirements while planning. Open a requirement group for course-level evidence; you will not need to remember it in the scheduler.</p>
      <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <span className="icon text-xl">contact_support</span>
        <div><b>Manual information is not a verified degree audit.</b><div className="mt-0.5">Your declared program can guide browsing, but remaining requirements and academic eligibility need verification. You can upload a DPR later.</div></div>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between"><h2 className="text-xl font-bold">{program.major}, {program.degree === 'Bachelor of Arts' ? 'B.A.' : 'B.S.'}</h2>
              <span className="flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold"><span className="icon text-sm">person</span>Student entered</span></div>
            <div className="mt-2 text-sm text-slate-600">{program.career} · Catalog term Fall 2023 · {program.minor === 'None declared' ? 'No minor declared' : `Minor: ${program.minor}`}</div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-bold">Requirement progress</h2><div className="mt-1 text-sm text-slate-600">In-progress and planned courses remain separate from completed work.</div></div>
            <div className="px-6 py-8 text-center"><span className="icon text-3xl text-amber-700">warning</span>
              <div className="mt-2 font-bold">Requirement details are not verified</div>
              <div className="mx-auto mt-1 max-w-md text-sm text-slate-600">Upload a DPR or verify requirements with an academic advisor before treating this overview as complete.</div></div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Course status</h2>
            <ul className="mt-4 space-y-3">{STATUS.map(([ic, l, n, c]) => (
              <li key={l} className="flex items-center gap-3"><span className={`icon grid size-8 place-items-center rounded-lg bg-slate-100 text-lg ${c}`}>{ic}</span><span className="flex-1 text-sm font-medium">{l}</span><b>{n}</b></li>))}</ul>
          </section>
          <section className="rounded-xl bg-brand-950 p-5 text-white">
            <span className="icon text-2xl">calendar_month</span>
            <h2 className="mt-3 font-bold">Ready to plan Fall 2026?</h2>
            <p className="mt-1 text-sm text-white/80">Set constraints beside a live weekly schedule. Recommendations will link back to this evidence.</p>
            <button onClick={onNext} className="mt-4 w-full rounded-lg bg-white py-3 text-sm font-semibold text-brand-900">Semester schedule</button>
            <button onClick={onBrowse} className="mt-3 w-full text-sm font-semibold">Browse courses</button>
          </section>
        </aside>
      </div>
    </div>
  )
}
