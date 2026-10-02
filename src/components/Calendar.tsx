import { DAYS, cid, conflictsWith, range } from '../data'
import type { Course } from '../data'

const START = 8 * 60
const ROW = 44
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i)

export default function Calendar({
  courses, selected, onSelect,
}: { courses: Course[]; selected: string | null; onSelect: (id: string | null) => void }) {
  const label = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? 'PM' : 'AM'}`
  return (
    <div className="rounded-lg border border-slate-300 bg-white">
      <div className="grid grid-cols-[72px_repeat(5,1fr)] rounded-t-lg border-b border-slate-300 bg-slate-100 text-center text-xs font-semibold">
        <div className="py-2.5 text-slate-500">Time</div>
        {DAYS.map((d) => <div key={d} className="border-l border-slate-300 py-2.5">{d}</div>)}
      </div>
      <div className="relative grid grid-cols-[72px_repeat(5,1fr)]" style={{ height: HOURS.length * ROW }}>
        <div>
          {HOURS.map((h) => (
            <div key={h} style={{ height: ROW }} className="pr-2 text-right text-[11px] text-slate-500">
              <span className="relative -top-1.5">{label(h)}</span>
            </div>
          ))}
        </div>
        {DAYS.map((d) => (
          <div key={d} className="relative border-l border-slate-300">
            {courses.flatMap((c) =>
              c.meetings.filter((m) => m.day === d).map((m) => {
                const id = cid(c)
                const warn = c.permission
                const clash = conflictsWith(c, courses)
                return (
                  <button
                    key={id + d}
                    onClick={() => onSelect(selected === id ? null : id)}
                    style={{ top: ((m.start - START) / 60) * ROW + 2, '--h': `${((m.end - m.start) / 60) * ROW - 4}px` } as React.CSSProperties}
                    className={`group absolute inset-x-1 h-(--h) overflow-hidden rounded-md border-l-4 p-2 text-left text-[11px] leading-snug transition-shadow hover:z-30 hover:h-auto! hover:min-h-(--h) hover:overflow-visible hover:shadow-lg focus-visible:z-30 focus-visible:h-auto! focus-visible:min-h-(--h) focus-visible:overflow-visible focus-visible:shadow-lg ${
                      clash ? 'border-amber-300 bg-[#fffbeb]' : 'border-violet-300 bg-[#f2effa]'
                    } ${selected === id ? 'ring-2 ring-brand-700' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <b>{c.code} [{c.section}]</b>
                      {warn && <span className="icon text-base text-amber-700">warning</span>}
                    </div>
                    <div className="font-semibold">{c.title}</div>
                    <div className="mt-0.5 text-[10px] italic text-slate-500">Class Number: {c.classNumber}</div>
                    <div className="mt-1">{range(m.start, m.end)}</div>
                    {warn && <div className="mt-0.5 text-[10px] font-semibold text-amber-800">Permission number required</div>}
                    <div className="mt-1.5 hidden border-t border-violet-200 pt-1.5 text-[10px] text-slate-700 group-hover:block group-focus-visible:block">
                      <div>{c.instructor} · {c.units} units · {c.mode}</div>
                      <div>{c.seats} seats · {c.waitlist} waitlist</div>
                      {c.meetings.map((x) => <div key={x.day + x.start}>{x.day} {range(x.start, x.end)} · {x.location}</div>)}
                    </div>
                  </button>
                )
              }),
            )}
          </div>
        ))}
        {HOURS.slice(1).map((h) => (
          <div key={h} className="pointer-events-none absolute left-[72px] right-0 border-t border-slate-100" style={{ top: (h - 8) * ROW }} />
        ))}
      </div>
    </div>
  )
}
