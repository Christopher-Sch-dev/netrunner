/**
 * role: netrunner inspect <url> (P4.1, AC-I1..I9) — consola/red/perf/a11y de una web.
 * Motor default: fetch nativo local (sin deps) → rendered:false + hint --render.
 * BrowserAdapter DI (CDP JSON-RPC) opcional → consola/red/perf/a11y reales (rendered:true).
 * NetRunner NO reimplementa browser: usa CDP (Chrome DevTools Protocol) vía el adapter.
 */
import type { HttpFetch } from './extract'

/** rol: contrato del BrowserAdapter inyectable (CDP JSON-RPC). Nunca se instancia inline. */
export interface BrowserAdapter {
  /** rol: navega y devuelve consola/red/perf/a11y de la página. */
  inspect(url: string): Promise<InspectData>
}

export interface ConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug'
  text: string
}

export interface NetworkEntry {
  url: string
  method: string
  status: number
}

export interface PerfTimings {
  domContentLoaded: number
  load: number
  fcp: number
  lcp: number
}

export interface A11yNode {
  role: string
  name: string
}

export interface InspectData {
  console: ConsoleEntry[]
  network: NetworkEntry[]
  perf: PerfTimings
  a11y: A11yNode[]
}

export interface InspectResult extends InspectData {
  /** motor usado: 'local' (fetch nativo) o 'cdp' (BrowserAdapter DI). */
  source: 'local' | 'cdp'
  /** true si hubo browser real (CDP); false si solo fetch local (AC-I1). */
  rendered: boolean
  /** sugerencia para el agente cuando no hay browser (AC-I1). */
  hint: string
}

export interface InspectOptions {
  /** BrowserAdapter (CDP) inyectado por DI — SOLO si el usuario lo configuró explícitamente. */
  adapter?: BrowserAdapter
  /** fetch local (default: globalThis.fetch de Bun). */
  httpFetch?: HttpFetch
}

const FETCH_TIMEOUT_MS = 5_000

/** rol: fetch local con timeout — solo para confirmar que la URL responde (AC-I1). */
async function localProbe(url: string, httpFetch: HttpFetch): Promise<void> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await httpFetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'netrunner-inspect/0.1 (+study)' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } finally {
    clearTimeout(timer)
  }
}

const EMPTY: InspectData = {
  console: [],
  network: [],
  perf: { domContentLoaded: 0, load: 0, fcp: 0, lcp: 0 },
  a11y: [],
}

/** rol: punto de entrada — inspecciona una web con CDP (DI) o fetch local (rendered:false). */
export async function inspectWeb(url: string, opts: InspectOptions = {}): Promise<InspectResult> {
  const httpFetch: HttpFetch = opts.httpFetch ?? ((u, init) => fetch(u, init))
  // BrowserAdapter SOLO si se inyectó por DI (usuario lo configuró explícitamente) — nunca por defecto.
  if (opts.adapter) {
    const data = await opts.adapter.inspect(url)
    return { ...EMPTY, ...data, source: 'cdp', rendered: true, hint: '' }
  }
  // motor local: confirma que la URL responde, pero sin browser no hay consola/red/perf/a11y reales.
  await localProbe(url, httpFetch)
  return {
    ...EMPTY,
    source: 'local',
    rendered: false,
    hint: 'sin browser: usa --render (BrowserAdapter CDP) para consola/red/perf/a11y reales',
  }
}
