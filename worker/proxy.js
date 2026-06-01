/**
 * Cloudflare Worker — SympoRead 中繼代理
 * 部署步驟：
 * 1. wrangler secret put GEMINI_API_KEY
 * 2. wrangler deploy
 *
 * 環境變數 (wrangler.toml):
 *   ALLOWED_ORIGIN = "https://your-app.pages.dev"
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowedOrigin = env.ALLOWED_ORIGIN || '*'

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    const url = new URL(request.url)

    if (url.pathname.startsWith('/gemini/')) {
      const apiPath = url.pathname.replace('/gemini/', '')
      const targetUrl = `https://generativelanguage.googleapis.com/${apiPath}?key=${env.GEMINI_API_KEY}`

      const proxyReq = new Request(targetUrl, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: request.method !== 'GET' ? request.body : undefined,
      })

      const res = await fetch(proxyReq)
      const body = await res.text()

      return new Response(body, {
        status: res.status,
        headers: {
          'Content-Type': res.headers.get('Content-Type') || 'application/json',
          ...corsHeaders,
        },
      })
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  },
}
