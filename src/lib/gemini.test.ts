import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
type Mod = typeof import('./gemini.ts')
let g: Mod

const ok = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 })
const store = new Map<string, string>()

beforeEach(async () => {
  store.clear()
  vi.stubEnv('VITE_GEMINI_API_KEY', '') // never use the developer's real key from .env.local
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network blocked in tests')))
  vi.resetModules()
  g = await import('./gemini.ts')
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) })
  g.saveGeminiKey('test-key')
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

const fc = (name: string, args: object, id = 'c1', sig = 'sig-1') => new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ functionCall: { name, args, id }, thoughtSignature: sig }] } }] }), { status: 200 })

describe('askGeminiAgent (tool loop)', () => {
  const tools = [{ name: 'path_to', description: 'd' }]
  it('runs the requested tool in the browser, sends the result back with the signature unchanged, then returns the final JSON', async () => {
    const f = vi.fn().mockResolvedValueOnce(fc('path_to', { code: 'DES 505' })).mockResolvedValueOnce(ok('{"onTopic":true,"message":"done","add":[],"remove":[]}'))
    vi.stubGlobal('fetch', f)
    const run = vi.fn().mockReturnValue({ steps: ['DES 222'] })
    const seen: string[] = []
    const out = await g.askGeminiAgent<{ message: string }>({ system: 's', question: 'q', tools, run, onTool: (n) => seen.push(n) })
    expect(out.message).toBe('done')
    expect(run).toHaveBeenCalledWith('path_to', { code: 'DES 505' })
    expect(seen).toEqual(['path_to'])
    const second = JSON.parse(String((f.mock.calls[1][1] as RequestInit).body))
    expect(second.contents).toHaveLength(3)
    expect(second.contents[1].parts[0].thoughtSignature).toBe('sig-1')
    expect(second.contents[2]).toEqual({ role: 'user', parts: [{ functionResponse: { name: 'path_to', id: 'c1', response: { steps: ['DES 222'] } } }] })
    expect(second.tools).toEqual([{ functionDeclarations: tools }])
  })
  it('turns a tool that throws into an error result instead of failing the chat', async () => {
    const f = vi.fn().mockResolvedValueOnce(fc('path_to', {})).mockResolvedValueOnce(ok('{"onTopic":true,"message":"ok","add":[],"remove":[]}'))
    vi.stubGlobal('fetch', f)
    await g.askGeminiAgent({ system: 's', question: 'q', tools, run: () => { throw new Error('boom') } })
    expect(JSON.parse(String((f.mock.calls[1][1] as RequestInit).body)).contents[2].parts[0].functionResponse.response).toEqual({ error: 'tool failed' })
  })
  it('wraps a non-object tool result', async () => {
    const f = vi.fn().mockResolvedValueOnce(fc('path_to', {})).mockResolvedValueOnce(ok('{"message":"ok"}'))
    vi.stubGlobal('fetch', f)
    await g.askGeminiAgent({ system: 's', question: 'q', tools, run: () => 5 })
    expect(JSON.parse(String((f.mock.calls[1][1] as RequestInit).body)).contents[2].parts[0].functionResponse.response).toEqual({ result: 5 })
  })
  it('stops after the step limit instead of looping forever', async () => {
    const f = vi.fn().mockImplementation(() => Promise.resolve(fc('path_to', {})))
    vi.stubGlobal('fetch', f)
    const run = vi.fn().mockReturnValue({})
    await expect(g.askGeminiAgent({ system: 's', question: 'q', tools, run, maxSteps: 3 })).rejects.toThrow(/too many lookups/)
    expect(run).toHaveBeenCalledTimes(3)
    expect(f).toHaveBeenCalledTimes(4) // 3 rounds + the forced final attempt
  })
  it('after the lookup limit it switches tools off and forces an answer instead of failing', async () => {
    const f = vi.fn().mockResolvedValueOnce(fc('path_to', {})).mockResolvedValueOnce(fc('path_to', {}, 'c2')).mockResolvedValueOnce(ok('{"onTopic":true,"message":"forced","add":[],"remove":[]}'))
    vi.stubGlobal('fetch', f)
    const out = await g.askGeminiAgent<{ message: string }>({ system: 's', question: 'q', tools, run: vi.fn().mockReturnValue({}), maxSteps: 2 })
    expect(out.message).toBe('forced')
    expect(f).toHaveBeenCalledTimes(3)
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body)).toolConfig).toBeUndefined()
    expect(JSON.parse(String((f.mock.calls[2][1] as RequestInit).body)).toolConfig).toEqual({ functionCallingConfig: { mode: 'NONE' } })
  })
  it('defaults to at most two lookup rounds (three requests)', async () => {
    const f = vi.fn().mockImplementation(() => Promise.resolve(fc('path_to', {})))
    vi.stubGlobal('fetch', f)
    await expect(g.askGeminiAgent({ system: 's', question: 'q', tools, run: vi.fn().mockReturnValue({}) })).rejects.toThrow(/too many lookups/)
    expect(f).toHaveBeenCalledTimes(3)
  })
  it('uses the Flash-Lite models first and the full Flash model only as a last resort', () => {
    expect(g.MODELS[0]).toBe('gemini-3.1-flash-lite')
    expect(g.MODELS[1]).toBe('gemini-flash-lite-latest')
    expect(g.MODELS[g.MODELS.length - 1]).toBe('gemini-3.8-flash')
  })
  it('answers directly when no tool is needed (one call)', async () => {
    const f = vi.fn().mockResolvedValue(ok('{"onTopic":true,"message":"direct","add":[],"remove":[]}'))
    vi.stubGlobal('fetch', f)
    const run = vi.fn()
    expect((await g.askGeminiAgent<{ message: string }>({ system: 's', question: 'q', tools, run })).message).toBe('direct')
    expect(run).not.toHaveBeenCalled()
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('falls back to the next model mid-loop when one is busy', async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response('busy', { status: 503 })).mockResolvedValueOnce(ok('{"message":"ok"}'))
    vi.stubGlobal('fetch', f)
    await expect(g.askGeminiAgent({ system: 's', question: 'q', tools, run: vi.fn() })).resolves.toEqual({ message: 'ok' })
    expect(String(f.mock.calls[1][0])).toContain(g.MODELS[1])
  })
  it('malformed final text gets the clear message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok('{"message": "cut')))
    await expect(g.askGeminiAgent({ system: 's', question: 'q', tools, run: vi.fn() })).rejects.toThrow(/cut off or malformed/)
  })
})

describe('askGeminiJson via the server-side proxy', () => {
  it('sends tool conversations to the proxy as contents + tools, with no key', async () => {
    vi.stubEnv('VITE_GEMINI_PROXY_URL', 'https://proxy.example/')
    vi.resetModules()
    const m = await import('./gemini.ts')
    m.saveGeminiKey('')
    const f = vi.fn().mockResolvedValue(ok('{"message":"x"}'))
    vi.stubGlobal('fetch', f)
    await m.askGeminiAgent({ system: 's', question: 'q', tools: [{ name: 't', description: 'd' }], run: vi.fn() })
    const body = JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))
    expect(Object.keys(body).sort()).toEqual(['contents', 'model', 'system', 'tools'])
    expect(JSON.stringify((f.mock.calls[0][1] as RequestInit).headers)).not.toMatch(/api-key/i)
  })
  it('posts to the proxy with no key and hides the key box', async () => {
    vi.stubEnv('VITE_GEMINI_PROXY_URL', 'https://proxy.example/')
    vi.resetModules()
    const m = await import('./gemini.ts')
    m.saveGeminiKey('') // no browser key at all
    const f = vi.fn().mockResolvedValue(ok('{"message":"via proxy"}'))
    vi.stubGlobal('fetch', f)
    expect(m.usesProxy).toBe(true)
    expect(await m.askGeminiJson<{ message: string }>('sys', 'hi')).toEqual({ message: 'via proxy' })
    const [url, init] = f.mock.calls[0]
    expect(String(url)).toBe('https://proxy.example/')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ model: m.MODELS[0], system: 'sys', user: 'hi' })
    expect(JSON.stringify((init as RequestInit).headers)).not.toMatch(/api-key/i)
  })
})

describe('askGeminiJson', () => {
  it('sends the key in a header, never in the URL', async () => {
    const f = vi.fn().mockResolvedValue(ok('{"message":"hi"}'))
    vi.stubGlobal('fetch', f)
    await g.askGeminiJson('sys', 'user')
    const [url, init] = f.mock.calls[0]
    expect(String(url)).not.toContain('test-key')
    expect((init as RequestInit).headers).toMatchObject({ 'x-goog-api-key': 'test-key' })
  })
  it('asks Google for structured output with the answer schema', async () => {
    const f = vi.fn().mockResolvedValue(ok('{"onTopic":true,"message":"x","add":[],"remove":[]}'))
    vi.stubGlobal('fetch', f)
    await g.askGeminiJson('s', 'u')
    const sent = JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))
    expect(sent.generationConfig.responseSchema).toEqual(g.RESPONSE_SCHEMA)
    expect(g.RESPONSE_SCHEMA.required).toEqual(['onTopic', 'message', 'add', 'remove'])
  })
  it('does not hammer other models when the app’s own rate limit says wait', async () => {
    const f = vi.fn().mockResolvedValue(new Response('{"error":"rate_limited","retryAfterSeconds":10}', { status: 429 }))
    vi.stubGlobal('fetch', f)
    await expect(g.askGeminiJson('s', 'u')).rejects.toThrow(/Wait a few seconds/)
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('falls back to the next model when the first is retired (404)', async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response('gone', { status: 404 })).mockResolvedValueOnce(ok('{"message":"from fallback"}'))
    vi.stubGlobal('fetch', f)
    expect(await g.askGeminiJson<{ message: string }>('s', 'u')).toEqual({ message: 'from fallback' })
    expect(String(f.mock.calls[0][0])).toContain(g.MODELS[0])
    expect(String(f.mock.calls[1][0])).toContain(g.MODELS[1])
  })
  it('keeps trying down the whole model list while servers are busy', async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response('busy', { status: 503 })).mockResolvedValueOnce(new Response('busy', { status: 503 })).mockResolvedValueOnce(ok('{"message":"third"}'))
    vi.stubGlobal('fetch', f)
    await expect(g.askGeminiJson('s', 'u')).resolves.toEqual({ message: 'third' })
    expect(f).toHaveBeenCalledTimes(3)
  })
  it('falls back on a busy server (503)', async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response('busy', { status: 503 })).mockResolvedValueOnce(ok('{"message":"ok"}'))
    vi.stubGlobal('fetch', f)
    await expect(g.askGeminiJson('s', 'u')).resolves.toEqual({ message: 'ok' })
  })
  it('does not retry a bad key (401/403) and reports it', async () => {
    const f = vi.fn().mockResolvedValue(new Response('bad key', { status: 403 }))
    vi.stubGlobal('fetch', f)
    await expect(g.askGeminiJson('s', 'u')).rejects.toThrow(/403/)
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('reports an error when every model fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status: 503 })))
    await expect(g.askGeminiJson('s', 'u')).rejects.toThrow(/503/)
  })
  it('gives a clear message when the answer is cut off mid-JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok('{"message": "The courses you can take on')))
    await expect(g.askGeminiJson('s', 'u')).rejects.toThrow(/cut off or malformed/)
  })
  it('asks for a key when none is saved', async () => {
    g.saveGeminiKey('')
    await expect(g.askGeminiJson('s', 'u')).rejects.toThrow(/API key/)
  })
})
