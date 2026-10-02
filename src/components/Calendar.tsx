import { DAYS, cid, range } from '../data'
import type { Course } from '../data'

const START = 8 * 60
const ROW = 44
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i)

export default function Calendar({
  courses, selected, onSelect,
}: { courses: Course[]; selected: string | null; onSelect: (id: string | null) => void }) {
  const label = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? 'PM' : 'AM'}`
  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <div className="grid grid-cols-[72px_repeat(5,1fr)] border-b border-slate-300 bg-slate-100 text-center text-xs font-semibold">
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
                return (
                  <button
                    key={id + d}
                    onClick={() => onSelect(selected === id ? null : id)}
                    style={{ top: ((m.start - START) / 60) * ROW + 2, height: ((m.end - m.start) / 60) * ROW - 4 }}
                    className={`absolute inset-x-1 overflow-hidden rounded-md border-l-4 p-2 text-left text-[11px] leading-snug ${
                      warn ? 'border-amber-300 bg-amber-50' : 'border-violet-300 bg-brand-100'
                    } ${selected === id ? 'ring-2 ring-brand-700' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <b>{c.code} [{c.section}]</b>
                      {warn && <span className="icon text-base text-amber-700">warning</span>}
                    </div>
                    <div className="font-semibold">{c.title}</div>
                    <div className="mt-0.5 text-[10px] italic text-slate-500">Class Number: {c.classNumber}</div>
                    <div className="mt-1">{range(m.start, m.end)}</div>
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
