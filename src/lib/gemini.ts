const MODEL = import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-2.5-flash'
const KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

export const hasGeminiKey = Boolean(KEY)

export async function askGeminiJson<T>(system: string, user: string): Promise<T> {
  if (!KEY) throw new Error('Gemini key missing. Add VITE_GEMINI_API_KEY to .env.local and restart the dev server.')
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
