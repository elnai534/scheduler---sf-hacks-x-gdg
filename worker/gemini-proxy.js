/**
 * Cloudflare Worker: keeps the Gemini API key on the server so it never ships in the website.
 *
 * Settings (Cloudflare dashboard -> Worker -> Settings -> Variables and Secrets):
 *   GEMINI_API_KEY   (Secret, required)  your Google key
 *   ALLOWED_ORIGINS  (Text, optional)    comma list, default "https://elnai534.github.io"
 *
 * The site sends { model, system, user }; this forwards a fixed-shape request to Google.
 * It is NOT an open proxy: only allowed origins, only Gemini models, capped sizes, JSON output only.
 */
const DEFAULT_ORIGINS = 'https://elnai534.github.io'
const MAX_BYTES = 200_000
const MODEL_OK = /^gemini-[a-z0-9.\-]{1,40}$/

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
})
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

export default {
  /** @param {Request} request @param {{ GEMINI_API_KEY?: string, ALLOWED_ORIGINS?: string }} env */
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? ''
    const allowed = (env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean)
    const localDev = /^http:\/\/localhost:\d+$/.test(origin)
    if (!allowed.includes(origin) && !localDev) return json(403, { error: 'Origin not allowed' })
    const headers = cors(origin)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return json(405, { error: 'POST only' }, headers)
    if (!env.GEMINI_API_KEY) return json(500, { error: 'Server is missing GEMINI_API_KEY' }, headers)

    const raw = await request.text()
    if (raw.length > MAX_BYTES) return json(413, { error: 'Request too large' }, headers)
    let body
    try { body = JSON.parse(raw) } catch { return json(400, { error: 'Invalid JSON' }, headers) }
    const { model, system, user } = body ?? {}
    if (typeof model !== 'string' || !MODEL_OK.test(model)) return json(400, { error: 'Invalid model' }, headers)
    if (typeof system !== 'string' || typeof user !== 'string' || !user.trim()) return json(400, { error: 'Missing system or user text' }, headers)

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048 },
      }),
    })
    return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json', ...headers } })
  },
}
