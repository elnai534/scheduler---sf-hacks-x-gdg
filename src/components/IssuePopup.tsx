import type { Course } from '../data'
import { cid } from '../data'

export default function IssuePopup({ course, issues, onAdd, onCancel }: { course: Course; issues: string[]; onAdd: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" role="alertdialog" aria-modal="true">
      <div className="w-[420px] rounded-xl bg-white p-5 shadow-xl">
        <h3 className="flex items-center gap-2 text-lg font-bold"><span className="icon text-2xl text-amber-700">warning</span>Heads up before adding</h3>
        <div className="mt-2 text-sm font-semibold">{cid(course)} · {course.title}</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Don’t add</button>
          <button onClick={onAdd} className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Add anyway</button>
        </div>
      </div>
    </div>
  )
}
