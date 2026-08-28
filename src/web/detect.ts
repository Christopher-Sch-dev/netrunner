/**
 * role: Detección determinista del stack/framework de una web (AC-E5/E7, K1.1/K1.5).
 * Heurística sobre HTML (meta generator, markers de frameworks, hints de clase, assets)
 * y headers de respuesta — sin LLM, sin browser.
 */

export interface WebStack {
  /** frameworks/CMS detectados (astro, next, nuxt, wordpress, ...) — puede ser [] */
  framework: string[]
  /** generador declarado en <meta name="generator">, si existe */
  generator: string | null
  /** servidores detectados por headers X-Powered-By / Server (K1.5) — puede ser [] */
  server: string[]
}

/** rol: resultado de detección de SPA (K1.1). */
export interface SpaDetection {
  isSpa: boolean
  indicator: string | null
}

/** rol: lee el <meta name="generator"> del HTML, o null. */
function generatorOf(html: string): string | null {
  const match = html.match(/<meta[^>]+name=["']generator["'][^>]*content=["']([^"']*)["']/i)
  return match ? match[1].trim() : null
}

/** rol: mapea el generador declarado a un framework normalizado. */
function frameworkFromGenerator(generator: string): string[] {
  const g = generator.toLowerCase()
  if (g.includes('astro')) return ['astro']
  if (g.includes('next') || g.includes('next.js')) return ['next']
  if (g.includes('gatsby')) return ['gatsby']
  if (g.includes('ghost')) return ['ghost']
  if (g.includes('hugo')) return ['hugo']
  if (g.includes('jekyll')) return ['jekyll']
  if (g.includes('wordpress')) return ['wordpress']
  return []
}

/** rol: detecta SPA client-rendered por contenedor raíz casi vacío + scripts, o markers client (K1.1). */
export function detectSPA(html: string): SpaDetection {
  // markers de frameworks client-rendered inequívocos
  if (/__NEXT_DATA__/i.test(html)) return { isSpa: true, indicator: '__NEXT_DATA__' }
  if (/__NUXT__|__NUXT_DATA__/i.test(html)) return { isSpa: true, indicator: '__NUXT__' }
  if (/astro-island/i.test(html)) return { isSpa: true, indicator: 'astro-island' }

  // contenedor raíz (div#root / #app / #__next) que aparece sin contenido visible
  const rootMatch = html.match(/<div[^>]+id=["'](root|app|__next)["'][^>]*>\s*<\/div>/i)
  if (rootMatch) {
    const hasBigScript = /<script[^>]+src=["'][^"']*(?:bundle|app|index|main)[^"']*\.js/i.test(html)
    // div raíz vacío + script JS grande → casi seguro client-rendered
    if (hasBigScript) return { isSpa: true, indicator: `div#${rootMatch[1]} vacío + bundle js` }
    // div raíz vacío sin contenido real visible → probable SPA
    const visible = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').trim()
    if (visible.length === 0) return { isSpa: true, indicator: `div#${rootMatch[1]} vacío` }
  }
  return { isSpa: false, indicator: null }
}

/** rol: detecta stack por meta generator, markers de frameworks, hints de clase y paths de assets. */
export function detectStackFromHtml(html: string, opts: { headers?: Record<string, string> } = {}): WebStack {
  const framework = new Set<string>()
  const generator = generatorOf(html)
  if (generator) for (const f of frameworkFromGenerator(generator)) framework.add(f)

  // markers de frameworks (K1.5)
  if (/__NEXT_DATA__|\/_next\/|__next\//i.test(html)) framework.add('next')
  if (/__NUXT__|__NUXT_DATA__|id=["']__nuxt["']/i.test(html)) framework.add('nuxt')
  if (/__remix_/i.test(html)) framework.add('remix')
  if (/_astro\/|astro-island|class=["'][^"']*(?:\bastro-|__next-)/i.test(html)) framework.add('astro')
  // CMS
  if (/wp-content|wp-includes|wp-json/i.test(html)) framework.add('wordpress')
  if (/webflow/i.test(html)) framework.add('webflow')
  if (/wixstatic|wix\.com/i.test(html)) framework.add('wix')

  // servidores por headers (K1.5)
  const server = new Set<string>()
  const headers = opts.headers ?? {}
  const poweredBy = headers['x-powered-by'] ?? headers['X-Powered-By'] ?? ''
  const serverHdr = headers['server'] ?? headers['Server'] ?? ''
  if (/next/i.test(poweredBy)) server.add('next')
  if (/express/i.test(poweredBy)) server.add('express')
  if (/nginx/i.test(serverHdr)) server.add('nginx')
  if (/cloudflare/i.test(serverHdr)) server.add('cloudflare')

  return { framework: [...framework], generator, server: [...server] }
}
