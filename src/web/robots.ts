/**
 * role: Respeto de robots.txt y meta robots (AC-E6) — determinista, sin browser.
 * parsea robots.txt (User-agent / Allow / Disallow) y <meta name="robots">.
 */

/** rol: comprueba si una URL está permitida por un robots.txt (match de ruta por prefijo). */
export function isAllowedByRobots(url: string, robotsTxt: string): boolean {
  const path = new URL(url).pathname
  // ponytail: solo User-agent: * (sin asteriscos ni wildcards — suficiente para el contrato)
  const disallows = robotsTxt
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^disallow:/i.test(l))
    .map((l) => l.replace(/^disallow:\s*/i, ''))
    .filter((d) => d.length > 0)
  return !disallows.some((d) => path.startsWith(d))
}

/** rol: detecta si el HTML tiene <meta name="robots"> con noindex/nofollow. */
export function metaRobotsDisallow(html: string): boolean {
  const match = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)
  if (!match) return false
  return /noindex|nofollow/i.test(match[0])
}
