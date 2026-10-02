const MAJORS = ['Design (BA)', 'Computer Science (BS)', 'Biology (BS)', 'American Indian Studies (BA)']
const TYPES = ['First-year', 'Transfer', 'Continuing', 'Graduate']

export default function Setup({ major, setMajor, type, setType, onNext }: {
  major: string; setMajor: (v: string) => void; type: string; setType: (v: string) => void; onNext: () => void
}) {
  return (
    <div className="mx-auto max-w-xl px-6 py-14">
      <div className="text-sm font-medium text-brand-900">Program setup</div>
      <h1 className="mt-1 text-3xl font-bold">Tell us about your program</h1>
      <p className="mt-3 text-slate-600">We use this to pull your degree requirements. This is a planning tool, not enrollment.</p>
      <div className="mt-8 space-y-6 rounded-2xl border border-slate-300 bg-white p-6">
        <label className="block text-sm font-semibold">Major
          <select value={major} onChange={(e) => setMajor(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-brand-700">
            {MAJORS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <div>
          <div className="text-sm font-semibold">Student type</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)} className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${type === t ? 'border-brand-900 bg-brand-100 text-brand-900' : 'border-slate-300 hover:bg-slate-50'}`}>{t}</button>
            ))}
          </div>
        </div>
        <button onClick={onNext} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-900 py-3 text-sm font-semibold text-white hover:bg-brand-700">
          Continue <span className="icon text-lg">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
