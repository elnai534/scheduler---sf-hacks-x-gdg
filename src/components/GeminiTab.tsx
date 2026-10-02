import { useRef, useState } from 'react'
import { CATALOG, SCHEDULABLE } from '../data'
import { buildGeminiContext } from '../lib/geminiContext'
import { precheckQuestion, sanitizeReply } from '../lib/geminiGuard'
import { completedCodes, inProgressCodes } from '../dpr/parse'
import type { DprReport } from '../dpr/types'
import type { Prefs, Recommendation } from '../recommend/recommend'
import type { Course } from '../data'
import { askGeminiAgent, askGeminiJson, getGeminiKey, keyIsFromBuild, saveGeminiKey, usesProxy } from '../lib/gemini'
import { TOOL_DECLARATIONS, needsGraphTools, runTool } from '../lib/geminiTools'

interface Msg { role: 'user' | 'ai'; text: string }

const CHIPS = ['Keep me off campus on Fridays', 'Fewer days on campus overall', 'Prefer online classes', 'Add DES 226 if it fits', 'Test Gemini recovery']

export default function GeminiTab({ accepted, onApply, report, prefs, rec }: { accepted: Course[]; onApply: (add: Course[], remove: string[]) => void; report: DprReport | null; prefs: Prefs; rec: Recommendation | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const [hasKey, setHasKey] = useState(usesProxy || Boolean(getGeminiKey()))
  const [keyDraft, setKeyDraft] = useState('')
  const [showKey, setShowKey] = useState(false)

  const lastSent = useRef(0)
  const [lookups, setLookups] = useState<string[]>([])

  async function send(raw: string) {
    if (!raw.trim() || busy) return
    setText('')
    const pre = precheckQuestion(raw)
    if (!pre.ok) { setMsgs((m) => [...m, { role: 'user', text: raw.slice(0, 500) }, { role: 'ai', text: pre.reply }]); return }
    if (Date.now() - lastSent.current < 4000) { setMsgs((m) => [...m, { role: 'user', text: pre.question }, { role: 'ai', text: 'Wait a few seconds before the next question.' }]); return }
    lastSent.current = Date.now()
    setMsgs((m) => [...m, { role: 'user', text: pre.question }])
    setLookups([])
    setBusy(true)
    try {
      const system = buildGeminiContext({ report, accepted, catalog: SCHEDULABLE, prefs, rec })
      const question = `<question>${pre.question}</question>`
      const raw = needsGraphTools(pre.question)
        ? await askGeminiAgent<unknown>({
            system,
            question,
            tools: TOOL_DECLARATIONS,
            run: (name, args) => runTool(name, args, { report, accepted, schedulable: SCHEDULABLE, all: CATALOG, prefs }),
            onTool: (name) => setLookups((l) => [...l, name.replace(/_/g, ' ')]),
          })
        : await askGeminiJson<unknown>(system, question) // one request, no tools
      const doing = report ? inProgressCodes(report) : new Set<string>()
      const assumed = new Set([...(report ? completedCodes(report) : []), ...doing])
      const safe = sanitizeReply(raw, { catalog: SCHEDULABLE, accepted, assumed, doing })
      onApply(safe.add, safe.remove)
      setMsgs((m) => [...m, { role: 'ai', text: safe.message }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'ai', text: `Could not get an answer. ${e instanceof Error ? e.message : String(e)}` }])
    } finally {
      setBusy(false)
      setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold"><span className="icon text-xl text-brand-900">auto_awesome</span>Ask Gemini</div>
        {!usesProxy && (hasKey ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500" />Connected</span>
            {!keyIsFromBuild && <button onClick={() => { saveGeminiKey(''); setHasKey(false) }} className="underline hover:text-slate-700">Disconnect</button>}
          </div>
        ) : (
          <button onClick={() => setShowKey((v) => !v)} className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
            <span className="size-1.5 rounded-full bg-slate-400" />Not connected<span className="font-semibold text-brand-900">· {showKey ? 'Cancel' : 'Add key'}</span>
          </button>
        ))}
      </div>
      {!usesProxy && !hasKey && showKey && (
        <form className="mb-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); saveGeminiKey(keyDraft); setHasKey(Boolean(keyDraft.trim())); setKeyDraft(''); setShowKey(false) }}>
          <input type="password" autoComplete="off" autoFocus value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="Paste Gemini API key" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-brand-700" />
          <button disabled={!keyDraft.trim()} className="rounded-lg bg-brand-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Save</button>
          <a className="shrink-0 text-xs text-slate-500 underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Get a key</a>
        </form>
      )}
      <div className="min-h-64 flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-300 bg-white p-3 text-sm">
        {msgs.length === 0 && !hasKey && <div className="text-slate-500">Chat is not connected. Add an API key (top right) to ask questions about your courses.</div>}
        {msgs.length === 0 && hasKey && <div className="text-slate-500">Ask me to adjust your schedule in plain language, or use a suggestion below. I can see the courses on your report, what you still need, and which classes you’re eligible for (not your name or ID).</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 ${m.role === 'user' ? 'ml-auto bg-brand-900 text-white' : 'bg-slate-100'}`}>{m.text}</div>
        ))}
        {busy && <div className="text-slate-500">{lookups.length ? `Checking the prerequisite graph (${[...new Set(lookups)].join(', ')})…` : 'Thinking…'}</div>}
        <div ref={end} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => send(c)} disabled={!hasKey || busy} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white">{c}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} disabled={!hasKey} placeholder={hasKey ? 'Describe a scheduling need...' : 'Not connected'} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-brand-700 disabled:bg-slate-100" />
        <button disabled={busy || !hasKey} className="grid w-14 place-items-center rounded-lg bg-brand-900 text-white disabled:cursor-not-allowed disabled:opacity-50"><span className="icon text-xl">send</span></button>
      </form>
    </div>
  )
}
