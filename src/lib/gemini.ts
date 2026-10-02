/**
 * Tried in order. Flash-Lite first: its free allowance (15 requests/minute, 1,000/day) is far larger than the full Flash models'
 * (20/day). A retired model (404) or a busy/over-quota one (429/503) falls through to the next.
 */
export const MODELS: string[] = [import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.8-flash']
const RETRYABLE = new Set([404, 429, 500, 503])

/** Structured output: the model can only answer in this shape. */
export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: { onTopic: { type: 'BOOLEAN' }, message: { type: 'STRING' }, add: { type: 'ARRAY', items: { type: 'STRING' } }, remove: { type: 'ARRAY', items: { type: 'STRING' } } },
  required: ['onTopic', 'message', 'add', 'remove'],
}
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
            generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
          }),
        })
    if (res.status === 429 && (await res.clone().text()).includes('rate_limited')) throw new Error('Too many questions in a short time. Wait a few seconds and try again.')
    if (res.ok || !RETRYABLE.has(res.status)) break
    lastErr = `${model}: ${res.status}`
  }
  if (!res || !res.ok) throw new Error(`Gemini ${res?.status ?? ''} ${(res ? (await res.text()).slice(0, 200) : lastErr)}`.trim())
  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('Gemini’s answer was cut off or malformed. Please try again.')
  }
}

// ---------------------------------------------------------------------------------------------
// Tool-calling loop. The model may ask for read-only tools (see geminiTools.ts); the browser runs
// them and sends the results back, until the model gives its final JSON answer.

export interface AgentOptions {
  system: string
  question: string
  tools: readonly object[]
  run: (name: string, args: unknown) => unknown
  maxSteps?: number
  /** Called with a tool name each time the model uses one (for a status line). */
  onTool?: (name: string) => void
}

interface Part { text?: string; functionCall?: { name: string; args?: unknown; id?: string }; thoughtSignature?: string; [k: string]: unknown }
interface Content { role: 'user' | 'model'; parts: Part[] }

async function callModels(system: string, contents: Content[], tools: readonly object[], forceAnswer = false): Promise<{ parts: Part[]; content: Content }> {
  const KEY = getGeminiKey()
  if (!usesProxy && !KEY) throw new Error('Add your Gemini API key above first.')
  let res: Response | null = null
  let lastErr = ''
  for (const model of MODELS) {
    res = usesProxy
      ? await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, system, contents, tools: [{ functionDeclarations: tools }], ...(forceAnswer ? { toolMode: 'NONE' } : {}) }) })
      : await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents,
            tools: [{ functionDeclarations: tools }],
            ...(forceAnswer ? { toolConfig: { functionCallingConfig: { mode: 'NONE' } } } : {}),
            generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, maxOutputTokens: 8192 },
          }),
        })
    if (res.status === 429 && (await res.clone().text()).includes('rate_limited')) throw new Error('Too many questions in a short time. Wait a few seconds and try again.')
    if (res.ok || !RETRYABLE.has(res.status)) break
    lastErr = `${model}: ${res.status}`
  }
  if (!res || !res.ok) throw new Error(`Gemini ${res?.status ?? ''} ${(res ? (await res.text()).slice(0, 200) : lastErr)}`.trim())
  const data = await res.json()
  const content = data.candidates?.[0]?.content as Content | undefined
  if (!content?.parts) throw new Error('Gemini returned an empty answer. Please try again.')
  return { parts: content.parts, content }
}

export async function askGeminiAgent<T>({ system, question, tools, run, maxSteps = 2, onTool }: AgentOptions): Promise<T> {
  const contents: Content[] = [{ role: 'user', parts: [{ text: question }] }]
  for (let step = 0; step <= maxSteps; step++) {
    // After maxSteps rounds of lookups the model must answer with what it has (tool calls switched off), instead of failing.
    const { parts, content } = await callModels(system, contents, tools, step === maxSteps)
    const calls = parts.filter((p) => p.functionCall)
    if (!calls.length) {
      const text = parts.map((p) => p.text ?? '').join('')
      try {
        return JSON.parse(text) as T
      } catch {
        throw new Error('Gemini’s answer was cut off or malformed. Please try again.')
      }
    }
    if (step === maxSteps) break // still asking for tools while they are switched off
    contents.push(content) // unchanged, including thoughtSignature, as Gemini 3 requires
    contents.push({
      role: 'user',
      parts: calls.map((p) => {
        const { name, args, id } = p.functionCall!
        onTool?.(name)
        let response: unknown
        try { response = run(name, args) } catch { response = { error: 'tool failed' } }
        return { functionResponse: { name, ...(id ? { id } : {}), response: (response && typeof response === 'object' ? response : { result: response }) as object } } as unknown as Part
      }),
    })
  }
  throw new Error('That question needed too many lookups. Try asking something simpler.')
}
