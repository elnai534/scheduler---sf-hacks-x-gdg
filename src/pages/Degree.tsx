import { REQUIREMENTS } from '../data'

export default function Degree({ major, type, onNext, onBack }: { major: string; type: string; onNext: () => void; onBack: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="text-sm font-medium text-brand-900">Degree overview</div>
      <h1 className="mt-1 text-3xl font-bold">Your requirement progress</h1>
      <p className="mt-3 text-slate-600">{major} · {type} student · example progress, verify with your advisor.</p>
      <div className="mt-8 space-y-4">
        {REQUIREMENTS.map((r) => (
          <div key={r.name} className="rounded-2xl border border-slate-300 bg-white p-5">
            <div className="flex items-end justify-between">
              <div className="font-semibold">{r.name}</div>
              <div className="text-right text-sm"><b>{r.done} / {r.total}</b><div className="text-xs text-slate-500">{r.total - r.done} units remaining</div></div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-900" style={{ width: `${(r.done / r.total) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-3">
        <button onClick={onBack} className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold">Back</button>
        <button onClick={onNext} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-900 py-3 text-sm font-semibold text-white hover:bg-brand-700">
          Build my schedule <span className="icon text-lg">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
