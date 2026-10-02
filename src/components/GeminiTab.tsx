import { useRef, useState } from 'react'
import { CATALOG, byId, cid } from '../data'
import type { Course } from '../data'
import { askGeminiJson } from '../lib/gemini'

interface Msg { role: 'user' | 'ai'; text: string }
interface Reply { message: string; add?: string[]; remove?: string[] }

const CHIPS = ['Keep me off campus on Fridays', 'Fewer days on campus overall', 'Prefer online classes', 'Add DES 226 if it fits', 'Test Gemini recovery']

export default function GeminiTab({ accepted, onApply }: { accepted: Course[]; onApply: (add: Course[], remove: string[]) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  async function send(q: string) {
    if (!q.trim() || busy) return
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setText('')
    setBusy(true)
    try {
      const catalog = CATALOG.map((c) => ({
        id: cid(c), title: c.title, units: c.units, mode: c.mode, seats: c.seats, permissionRequired: c.permission,
        meetings: c.meetings.map((m) => `${m.day} ${m.start / 60}-${m.end / 60}h ${m.mode}`),
      }))
      const system =
        'You are a scheduling assistant for SF State students. Planning only, never claim to enroll anyone. ' +
        'Reply as JSON: {"message": string (short, cite concrete schedule facts), "add": string[] of course ids to add, "remove": string[] of course ids to remove}. ' +
        'Only use ids from the catalog. Avoid time conflicts. ' +
        `Catalog: ${JSON.stringify(catalog)}. Currently accepted: ${JSON.stringify(accepted.map(cid))}.`
      const r = await askGeminiJson<Reply>(system, q)
      const add = (r.add ?? []).map(byId).filter((c): c is Course => Boolean(c))
      onApply(add, r.remove ?? [])
      setMsgs((m) => [...m, { role: 'ai', text: r.message }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'ai', text: `Couldn't reach Gemini. ${e instanceof Error ? e.message : String(e)}` }])
    } finally {
      setBusy(false)
      setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold"><span className="icon text-xl text-brand-900">auto_awesome</span>Ask Gemini</div>
      <div className="min-h-64 flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-300 bg-white p-3 text-sm">
        {msgs.length === 0 && <div className="text-slate-500">Ask me to adjust your schedule in plain language, or use a suggestion below.</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 ${m.role === 'user' ? 'ml-auto bg-brand-900 text-white' : 'bg-slate-100'}`}>{m.text}</div>
        ))}
        {busy && <div className="text-slate-500">Thinking…</div>}
        <div ref={end} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => send(c)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-brand-100">{c}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe a scheduling need..." className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-brand-700" />
        <button disabled={busy} className="grid w-14 place-items-center rounded-lg bg-brand-900 text-white disabled:opacity-50"><span className="icon text-xl">send</span></button>
      </form>
    </div>
  )
}
