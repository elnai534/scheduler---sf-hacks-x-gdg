import { useState } from 'react'
import { askGemini } from '../lib/gemini'

export default function SearchBar() {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      setAnswer(await askGemini(q))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={submit} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow ring-1 ring-slate-200 focus-within:ring-indigo-500">
        <span className="material-symbols-outlined text-slate-400">search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything, e.g. “find a 1h slot for a team sync Tuesday”"
          className="flex-1 bg-transparent outline-none placeholder:text-slate-400"
        />
        <button disabled={loading} className="material-symbols-outlined rounded-full bg-indigo-600 p-1 text-white disabled:opacity-50">
          {loading ? 'progress_activity' : 'arrow_upward'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {answer && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-4 text-sm shadow ring-1 ring-slate-200">{answer}</p>}
    </div>
  )
}
