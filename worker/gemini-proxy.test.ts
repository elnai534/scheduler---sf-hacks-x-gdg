import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// @ts-expect-error plain JS module deployed as-is to Cloudflare
import worker from './gemini-proxy.js'

const ORIGIN = 'https://elnai534.github.io'
const env = { GEMINI_API_KEY: 'secret-key-xyz' }
const req = (body: unknown, init: RequestInit = {}) =>
  new Request('https://proxy.test/', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body), ...init })
const good = { model: 'gemini-3.8-flash', system: 'sys', user: 'hello' }

let upstream: ReturnType<typeof vi.fn>
beforeEach(() => { upstream = vi.fn().mockResolvedValue(new Response('{"candidates":[]}', { status: 200 })); vi.stubGlobal('fetch', upstream) })
afterEach(() => vi.unstubAllGlobals())

describe('gemini proxy worker', () => {
  it('forwards a valid request to Google with the secret key in a header, not the URL', async () => {
    const res = await worker.fetch(req(good), env)
    expect(res.status).toBe(200)
    const [url, init] = upstream.mock.calls[0]
    expect(String(url)).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent')
    expect(String(url)).not.toContain('secret-key-xyz')
    expect((init as RequestInit).headers).toMatchObject({ 'x-goog-api-key': 'secret-key-xyz' })
    const sent = JSON.parse(String((init as RequestInit).body))
    expect(sent.generationConfig.responseMimeType).toBe('application/json')
    // thinking tokens (~3k with a big prompt) count against this; 2048 truncated real answers mid-JSON
    expect(sent.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(8192)
  })
  it('never returns the key to the browser', async () => {
    const res = await worker.fetch(req(good), env)
    expect(await res.text()).not.toContain('secret-key-xyz')
    expect([...res.headers.values()].join(' ')).not.toContain('secret-key-xyz')
  })
  it('answers CORS preflight for the allowed origin', async () => {
    const res = await worker.fetch(new Request('https://proxy.test/', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
  })
  it('rejects other origins (not an open proxy)', async () => {
    const res = await worker.fetch(req(good, { headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' } }), env)
    expect(res.status).toBe(403)
    expect(upstream).not.toHaveBeenCalled()
  })
  it('allows localhost for development', async () => {
    const res = await worker.fetch(req(good, { headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' } }), env)
    expect(res.status).toBe(200)
  })
  it('rejects non-Gemini or malformed model names', async () => {
    for (const model of ['gpt-4', '../../v1/other', 'gemini-3.8-flash:evil?x=1', '']) {
      expect((await worker.fetch(req({ ...good, model }), env)).status).toBe(400)
    }
    expect(upstream).not.toHaveBeenCalled()
  })
  it('rejects bad JSON, missing text, oversize bodies and wrong methods', async () => {
    expect((await worker.fetch(req('not json'), env)).status).toBe(400)
    expect((await worker.fetch(req({ model: good.model, system: 's', user: '  ' }), env)).status).toBe(400)
    expect((await worker.fetch(req({ ...good, system: 'x'.repeat(250_000) }), env)).status).toBe(413)
    expect((await worker.fetch(new Request('https://proxy.test/', { method: 'GET', headers: { Origin: ORIGIN } }), env)).status).toBe(405)
    expect(upstream).not.toHaveBeenCalled()
  })
  it('passes Google error statuses through so the app can fall back to another model', async () => {
    upstream.mockResolvedValue(new Response('{"error":{"code":503}}', { status: 503 }))
    expect((await worker.fetch(req(good), env)).status).toBe(503)
  })
  it('reports a server problem when the secret is not configured', async () => {
    expect((await worker.fetch(req(good), {})).status).toBe(500)
  })
  it('honors ALLOWED_ORIGINS from settings', async () => {
    const res = await worker.fetch(req(good, { headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' } }), { ...env, ALLOWED_ORIGINS: 'https://other.example' })
    expect(res.status).toBe(200)
  })
})
