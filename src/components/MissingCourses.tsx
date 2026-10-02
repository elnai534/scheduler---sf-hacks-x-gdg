import { CATALOG, SCHEDULABLE, conflictsWith } from '../data'
import type { Course } from '../data'
import { eligibility } from '../dag/graph'
import { completedCodes, inProgressCodes } from '../dpr/parse'
import type { DprReport, DprRequirement } from '../dpr/types'

const SHOWN = 8

/** Best section to offer for a course code: a timed section that fits the schedule, else any timed one, else the catalog entry. */
function pickSection(code: string, accepted: Course[]): Course | undefined {
  const timed = SCHEDULABLE.filter((c) => c.code === code)
  return timed.find((c) => !conflictsWith(c, accepted)) ?? timed[0] ?? CATALOG.find((c) => c.code === code)
}

/** Lists what a still-open requirement needs, with an Add button per course that can be added. */
export default function MissingCourses({ req, report, accepted, onToggle }: { req: DprRequirement; report: DprReport; accepted: Course[]; onToggle: (c: Course) => void }) {
  const done = completedCodes(report)
  const doing = inProgressCodes(report)
  const need = req.kind === 'courses' ? `${req.needed} more course${req.needed === 1 ? '' : 's'}` : req.kind === 'units' ? `${req.needed} more units` : 'Still open'
  const options = [...new Map(req.options.map((o) => [o.code, o])).values()]
  return (
    <div className="mt-1 rounded-lg bg-slate-50 p-2.5">
      <div className="flex justify-between gap-2 text-xs"><b>{req.name}</b><span className="shrink-0 font-semibold text-red-700">{need}</span></div>
      {options.length === 0 && <div className="mt-1 text-xs text-slate-500">No course list on the report. Search the Courses tab.</div>}
      <ul className="mt-1.5 space-y-1.5">
        {options.slice(0, SHOWN).map((o) => {
          const sec = pickSection(o.code, accepted)
          const added = accepted.some((a) => a.code === o.code)
          const e = sec ? eligibility(sec.node, new Set([...done, ...doing]), doing) : null
          return (
            <li key={o.code} className="flex items-center gap-2 text-xs">
              <div className="min-w-0 flex-1"><b>{o.code}</b> {o.title}
                {e && !e.ok && <div className="text-amber-800">Needs {e.unmet.map((g) => g.join(' or ')).join('; ')} first</div>}
                {sec && sec.mode === 'Catalog only' && <div className="text-slate-500">No section times yet</div>}
              </div>
              {added ? <span className="font-semibold text-emerald-700">Added</span>
                : !sec ? <span className="text-slate-500">Not offered</span>
                : <button onClick={() => onToggle(sec)} className="flex items-center gap-0.5 rounded-lg bg-brand-900 px-2.5 py-1 font-semibold text-white hover:bg-brand-700"><span className="icon text-sm">add</span>Add</button>}
            </li>
          )
        })}
      </ul>
      {options.length > SHOWN && <div className="mt-1 text-[11px] text-slate-500">+{options.length - SHOWN} more options in the Courses tab{req.optionsTotal && req.optionsTotal > req.options.length ? ' (report list was truncated)' : ''}.</div>}
    </div>
  )
}
