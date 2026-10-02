/** Tried in order. A retired model (404) or a busy one (429/503) falls through to the next. */
export const MODELS: string[] = [import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-3.8-flash', 'gemini-flash-latest']
const RETRYABLE = new Set([404, 429, 500, 503])
const ENV_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const STORAGE = 'scheduler.geminiKey'
/** When set, requests go through the server-side proxy (worker/gemini-proxy.js) and no key is needed in the browser. */
const PROXY = (import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined)?.trim() || ''
export const usesProxy = Boolean(PROXY)

/** Build-time key (local dev only) wins; otherwise the key the user pasted, kept only in this browser. */
export const getGeminiKey = (): string => ENV_KEY || (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE) ?? '' : '')
export const saveGeminiKey = (k: string) => { if (k.trim()) localStorage.setItem(STORAGE, k.trim()); else localStorage.removeItem(STORAGE) }
export const keyIsFromBuild = Boolean(ENV_KEY)

export async function askGeminiJson<T>(system: string, user: string): Promise<T> {
  const KEY = getGeminiKey()
  if (!usesProxy && !KEY) throw new Error('Add your Gemini API key above first.')
  let res: Response | null = null
  let lastErr = ''
  for (const model of MODELS) {
    res = usesProxy
      ? await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, system, user }) })
      : await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        })
    if (res.ok || !RETRYABLE.has(res.status)) break
    lastErr = `${model}: ${res.status}`
  }
  if (!res || !res.ok) throw new Error(`Gemini ${res?.status ?? ''} ${(res ? (await res.text()).slice(0, 200) : lastErr)}`.trim())
  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  return JSON.parse(text) as T
}
