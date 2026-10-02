const MODEL = import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-2.5-flash'
const KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

export async function askGemini(query: string, context = ''): Promise<string> {
  if (!KEY) throw new Error('Set VITE_GEMINI_API_KEY in .env.local and restart the dev server.')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `You are a scheduling assistant. Be concise. ${context}` }],
        },
        contents: [{ role: 'user', parts: [{ text: query }] }],
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? 'No response.'
}
