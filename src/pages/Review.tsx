import { cid, range } from '../data'
import type { Course } from '../data'

export default function Review({ courses, onBack }: { courses: Course[]; onBack: () => void }) {
  const units = courses.reduce((n, c) => n + c.units, 0)
  const permission = courses.filter((c) => c.permission)
  return (
    <div className="mx-auto max-w-[1240px] px-12 py-10">
      <div className="text-sm font-medium text-brand-900">Final review</div>
      <h1 className="mt-1 text-3xl font-bold">Review your accepted schedule</h1>
      <p className="mt-3 max-w-2xl text-slate-600">Confirm the selected term, section-specific meetings, class numbers, and unresolved information. This is a planning schedule, not enrollment.</p>
      <div className="mt-8 grid grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-white p-5">
            <div><div className="text-xl font-bold">Fall 2026</div><div className="text-sm text-slate-600">Academic Regular Session · {courses.length} sections</div></div>
            <div className="flex items-center gap-2"><span className="text-xl font-bold">{units} units</span><span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs">Accepted only</span></div>
          </div>
          {courses.map((c) => (
            <div key={cid(c)} className="rounded-xl border border-slate-300 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex flex-wrap items-center gap-2 text-lg font-bold">{cid(c)} · {c.title}
                  <span className="rounded-full border border-brand-200 bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-900">{c.mode}</span></div>
                <span className="text-xs text-slate-500">{c.division}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">Class #{c.classNumber} · {c.kind} · {c.units} units · {c.instructor}</div>
              <div className="mt-3 flex gap-3">
                {(c.meetings.length ? c.meetings.map((m) => ({ k: m.day, t: `${m.day} · ${range(m.start, m.end)}`, l: `${m.location} · ${m.mode}` })) : [{ k: 'none', t: 'No scheduled day or time', l: 'Online · Online' }]).map((m) => (
                  <div key={m.k} className="flex-1 rounded-lg bg-slate-100 p-3"><div className="text-sm font-semibold">{m.t}</div><div className="mt-1 flex items-center gap-1 text-xs text-slate-600"><span className="icon text-sm">location_on</span>{m.l}</div></div>
                ))}
              </div>
              {c.permission && <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-800"><span className="icon text-base">warning</span>Permission number required— verify outside this planner</div>}
            </div>
          ))}
          {courses.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No accepted sections yet. Go back to add some.</div>}
        </div>
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-300 bg-white p-5">
            <span className="icon text-3xl text-brand-900">task</span>
            <div className="mt-2 text-lg font-bold">Export planning schedule</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">The PDF includes the accepted term, sections, class numbers, units, timed and untimed components, locations, modes, and information to verify.</p>
            <button onClick={() => window.print()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-900 py-3 text-sm font-semibold text-white hover:bg-brand-700"><span className="icon text-lg">download</span>Export accepted schedule</button>
          </div>
          <div className="font-semibold">Unresolved information</div>
          {permission.length === 0 && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">Nothing unresolved.</div>}
          {permission.map((c) => (
            <div key={cid(c)} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold"><span className="icon text-base text-amber-700">warning</span>Permission requirement for {cid(c)}</div>
              <div className="mt-1 text-xs text-amber-800">Permission number required</div>
            </div>
          ))}
          <button onClick={onBack} className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-300 bg-white py-3 text-sm font-semibold text-brand-900"><span className="icon text-lg">arrow_back</span>Back to schedule</button>
          <p className="text-center text-xs text-slate-500">Future school add/drop integration is not available. Export does not register or enroll you in classes.</p>
        </aside>
      </div>
    </div>
  )
}
