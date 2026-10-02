import { useRef, useState } from 'react'
import { SCHEDULABLE, byId } from '../data'
import { buildGeminiContext } from '../lib/geminiContext'
import type { DprReport } from '../dpr/types'
import type { Prefs, Recommendation } from '../recommend/recommend'
import type { Course } from '../data'
import { askGeminiJson, getGeminiKey, keyIsFromBuild, saveGeminiKey } from '../lib/gemini'

interface Msg { role: 'user' | 'ai'; text: string }
interface Reply { message: string; add?: string[]; remove?: string[] }

const CHIPS = ['Keep me off campus on Fridays', 'Fewer days on campus overall', 'Prefer online classes', 'Add DES 226 if it fits', 'Test Gemini recovery']

export default function GeminiTab({ accepted, onApply, report, prefs, rec }: { accepted: Course[]; onApply: (add: Course[], remove: string[]) => void; report: DprReport | null; prefs: Prefs; rec: Recommendation | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const [hasKey, setHasKey] = useState(Boolean(getGeminiKey()))
  const [keyDraft, setKeyDraft] = useState('')

  async function send(q: string) {
    if (!q.trim() || busy) return
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setText('')
    setBusy(true)
    try {
      const system = buildGeminiContext({ report, accepted, catalog: SCHEDULABLE, prefs, rec })
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
      {!hasKey && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-semibold">Add a Gemini API key to chat</div>
          <p className="mt-1">Get a free key at <a className="underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>. It is saved only in this browser and sent only to Google.</p>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); saveGeminiKey(keyDraft); setHasKey(Boolean(keyDraft.trim())); setKeyDraft('') }}>
            <input type="password" autoComplete="off" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="Paste API key" className="flex-1 rounded-lg border border-amber-300 bg-white px-2 py-1.5 outline-brand-700" />
            <button disabled={!keyDraft.trim()} className="rounded-lg bg-brand-900 px-3 py-1.5 font-semibold text-white disabled:opacity-40">Save</button>
          </form>
        </div>
      )}
      {hasKey && !keyIsFromBuild && <button onClick={() => { saveGeminiKey(''); setHasKey(false) }} className="mb-2 self-start text-xs text-slate-500 underline">Remove saved key</button>}
      <div className="min-h-64 flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-300 bg-white p-3 text-sm">
        {msgs.length === 0 && <div className="text-slate-500">Ask me to adjust your schedule in plain language, or use a suggestion below. I can see the courses on your report, what you still need, and which classes you’re eligible for (not your name or ID).</div>}
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
