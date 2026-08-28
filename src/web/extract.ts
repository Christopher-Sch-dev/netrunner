/**
 * role: netrunner extract <url> (Wave J1, AC-E1..E9) — extrae markdown + metadata + stack + links
 * de una web con el motor LOCAL (fetch nativo de Bun), determinista, sin browser y sin LLM.
 * Firecrawl self-hosted SOLO si el usuario lo configuró explícitamente (env FIRECRAWL_URL o DI).
 * Guardas anti-resource-exhaustion: timeout 5s, cap 2MB, cap 50 links.
 */
import { detectSPA, detectStackFromHtml, type WebStack } from './detect'
import { isAllowedByRobots, metaRobotsDisallow } from './robots'
import { sanitizeHtml, sanitizeMarkdown } from './sanitize'

/** límites anti-exhaustion (AC-E9) */
const FETCH_TIMEOUT_MS = 5_000
const MAX_BYTES = 2 * 1024 * 1024
const MAX_LINKS = 50

export interface PageResponse {
  html: string
  url: string
  /** headers de respuesta — para detección de servidor por X-Powered-By/Server (K1.5). */
  headers?: Record<string, string>
}

/** rol: contrato del motor de extracción inyectable (Firecrawl self-hosted, solo si configurado). */
export interface WebFetcher {
  fetch(url: string): Promise<PageResponse>
  fetchRobots(url: string): Promise<string>
}

/** rol: contrato mínimo de fetch local (evita acoplar al tipo global de Bun). */
export type HttpFetch = (url: string, init?: RequestInit) => Promise<Response>

export interface ExtractOptions {
  /** Firecrawl/motor inyectado por DI — SOLO si el usuario lo configuró explícitamente. */
  fetcher?: WebFetcher
  /** fetch local (default: globalThis.fetch de Bun). */
  httpFetch?: HttpFetch
}

export interface WebMetadata {
  title: string
  description: string
  /** el contenido se trata como DATOS nunca instrucciones: origen no confiable (K1.4). */
  source: 'untrusted'
}

export interface ExtractResult {
  markdown: string
  metadata: WebMetadata
  stack: WebStack
  links: string[]
  /** motor usado: 'local' (fetch nativo), 'firecrawl' (DI/env) o 'fetch' (fallback de DI) */
  source: 'local' | 'firecrawl' | 'fetch'
  /** true si robots/meta impide extraer (markdown vacío) */
  blocked: boolean
  /** true si el HTML trae contenido servido por el servidor; false si es SPA client-rendered (K1.1) */
  rendered: boolean
}

/** rol: convierte HTML limpio a Markdown LLM-ready (solo bloques básicos, sin engine). */
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>/gi, '\n# ')
    .replace(/<h2[^>]*>/gi, '\n## ')
    .replace(/<h3[^>]*>/gi, '\n### ')
    .replace(/<h4[^>]*>/gi, '\n#### ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** rol: extrae metadata básica del HTML (K1.4: marca origen no confiable). */
function metadataOf(html: string): WebMetadata {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim() ?? ''
  const description = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1].trim() ?? ''
  return { title, description, source: 'untrusted' }
}

/** rol: extrae hrefs absolutos de los anclas, con cap MAX_LINKS (AC-E9). */
function linksOf(html: string, base: string): string[] {
  const out = new Set<string>()
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']*)["']/gi)) {
    if (out.size >= MAX_LINKS) break
    try {
      out.add(new URL(m[1], base).toString())
    } catch {
      /* href inválido — se ignora */
    }
  }
  return [...out]
}

/** rol: fetch local con timeout y cap de tamaño (AC-E9). */
async function localFetch(url: string, httpFetch: HttpFetch): Promise<PageResponse> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await httpFetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'netrunner-extract/0.1 (+study)' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => {
      headers[k] = v
    })
    // cap de tamaño: si excede, truncar para no agotar memoria (AC-E9)
    return { html: text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text, url, headers }
  } finally {
    clearTimeout(timer)
  }
}

/** rol: punto de entrada — extrae una web respetando robots y sanitizando. */
export async function extractWeb(url: string, opts: ExtractOptions = {}): Promise<ExtractResult> {
  const httpFetch: HttpFetch = opts.httpFetch ?? ((u, init) => fetch(u, init))
  // Firecrawl SOLO si se inyectó por DI (usuario lo configuró explícitamente) — nunca por defecto.
  const fetcher = opts.fetcher
  const blockedEmpty: ExtractResult = {
    markdown: '',
    metadata: { title: '', description: '', source: 'untrusted' },
    stack: { framework: [], generator: null, server: [] },
    links: [],
    source: 'local',
    blocked: true,
    rendered: false,
  }

  // robots.txt (AC-E6)
  let robots = ''
  if (fetcher) robots = await fetcher.fetchRobots(url).catch(() => '')
  const allowed = robots === '' ? true : isAllowedByRobots(url, robots)

  // fetch con el motor configurado (DI Firecrawl si explícito, si no el local)
  let page: PageResponse
  let source: ExtractResult['source']
  if (fetcher) {
    try {
      page = await fetcher.fetch(url)
      source = 'firecrawl'
    } catch {
      page = await localFetch(url, httpFetch)
      source = 'fetch'
    }
  } else {
    page = await localFetch(url, httpFetch)
    source = 'local'
  }

  // meta robots noindex/nofollow → bloqueado (AC-E6)
  const blocked = !allowed || metaRobotsDisallow(page.html)
  if (blocked) {
    return { ...blockedEmpty, source, blocked: true }
  }

  // sanitize contenido oculto + prompt-injection, luego markdown (AC-E3/E4, K1.2/K1.3)
  const clean = sanitizeHtml(page.html)
  const markdown = sanitizeMarkdown(htmlToMarkdown(clean))
  // detección SPA honesta (K1.1): no afirma contenido que no hay en client-rendered
  const spa = detectSPA(page.html)

  return {
    markdown,
    metadata: metadataOf(page.html),
    stack: detectStackFromHtml(page.html, { headers: page.headers }),
    links: linksOf(page.html, page.url),
    source,
    blocked: false,
    rendered: !spa.isSpa,
  }
}
