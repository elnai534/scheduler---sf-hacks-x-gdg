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

describe('askGeminiJson via the server-side proxy', () => {
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
  it('asks for a key when none is saved', async () => {
    g.saveGeminiKey('')
    await expect(g.askGeminiJson('s', 'u')).rejects.toThrow(/API key/)
  })
})
