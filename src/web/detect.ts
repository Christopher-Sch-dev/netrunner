/**
 * role: Detección determinista del stack/framework de una web (AC-E5/E7).
 * Heurística sobre HTML (meta generator, hints de clase, assets) — sin LLM, sin browser.
 */

export interface WebStack {
  /** frameworks/CMS detectados (astro, next, wordpress, ...) — puede ser [] */
  framework: string[]
  /** generador declarado en <meta name="generator">, si existe */
  generator: string | null
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

/** rol: detecta stack por meta generator, hints de clase y paths de assets. */
export function detectStackFromHtml(html: string): WebStack {
  const framework = new Set<string>()
  const generator = generatorOf(html)
  if (generator) for (const f of frameworkFromGenerator(generator)) framework.add(f)

  // hints por asset path
  if (/\/_astro\//i.test(html)) framework.add('astro')
  if (/\/_next\/|__next\//i.test(html)) framework.add('next')
  if (/wp-content|wp-includes/i.test(html)) framework.add('wordpress')
  if (/webflow/i.test(html)) framework.add('webflow')
  if (/wixstatic|wix\.com/i.test(html)) framework.add('wix')
  // hints por clase
  if (/class=["'][^"']*(?:\bastro-|__next-)/i.test(html)) framework.add('astro')

  return { framework: [...framework], generator }
}
