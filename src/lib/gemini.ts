const MODEL = import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-2.5-flash'
const ENV_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const STORAGE = 'scheduler.geminiKey'

/** Build-time key (local dev only) wins; otherwise the key the user pasted, kept only in this browser. */
export const getGeminiKey = (): string => ENV_KEY || (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE) ?? '' : '')
export const saveGeminiKey = (k: string) => { if (k.trim()) localStorage.setItem(STORAGE, k.trim()); else localStorage.removeItem(STORAGE) }
export const keyIsFromBuild = Boolean(ENV_KEY)

export async function askGeminiJson<T>(system: string, user: string): Promise<T> {
  const KEY = getGeminiKey()
  if (!KEY) throw new Error('Add your Gemini API key above first.')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  return JSON.parse(text) as T
}
