# Gemini proxy (Cloudflare Worker)

Lets the public GitHub Pages site use Gemini without putting your API key in the website.

## Set up (about 5 minutes, free)
1. Sign in at https://dash.cloudflare.com and open **Workers & Pages -> Create -> Create Worker**. Name it e.g. `scheduler-gemini`, then **Deploy**.
2. **Edit code**, replace everything with the contents of `worker/gemini-proxy.js`, then **Deploy**.
3. **Settings -> Variables and Secrets -> Add**:
   - Type **Secret**, name `GEMINI_API_KEY`, value = your key.
   - (Optional) Type **Text**, name `ALLOWED_ORIGINS`, value = `https://elnai534.github.io`.
4. Copy the Worker URL (looks like `https://scheduler-gemini.<you>.workers.dev`).
5. Give that URL to the app build as `VITE_GEMINI_PROXY_URL` (see below). Once set, the "paste your key" box disappears.

## Using it
- Local: add `VITE_GEMINI_PROXY_URL=https://scheduler-gemini.<you>.workers.dev` to `scheduler/.env.local`.
- Live site: build with `VITE_GEMINI_PROXY_URL=<url> VITE_GEMINI_API_KEY= BASE=/scheduler---sf-hacks-x-gdg/ npm run build`.
  The proxy URL is public on purpose; it is not a secret. The Google key stays inside Cloudflare.

## Limits worth setting
- Cloudflare dashboard -> Security -> WAF -> Rate limiting rules: e.g. 20 requests/minute per IP on this Worker.
- Google AI Studio / Cloud: set a quota or budget cap on the key.
