/**
 * rol: handlers web (Wave J) — extract, dna. Reciben DI del router.
 * Cada handler delega en el módulo y emite JSON parseable (ai-native-cli).
 */
import type { HandlerContext } from './types'

/** rol: netrunner extract <url> — extrae markdown+metadata+stack+links de una web (motor local). */
export async function extract(ctx: HandlerContext): Promise<void> {
  const { extractWeb } = await import('../../web/extract')
  const url = ctx.args[0] ?? ''
  if (!url) {
    ctx.fail('MISSING_REQUIRED', 'extract requiere una URL', 'netrunner extract <url>', 2)
  }
  try {
    const result = await extractWeb(url)
    ctx.emit(result, ctx.human)
    process.exit(0)
  } catch (e) {
    ctx.fail('EXTRACT_FAILED', `no se pudo extraer: ${(e as Error).message}`, 'verifica la URL y la conexión', 1)
  }
}

/** rol: netrunner dna <url> — extrae el ADN de diseño determinista de una web. */
export async function dna(ctx: HandlerContext): Promise<void> {
  const { dnaScan } = await import('../../dna/index')
  const url = ctx.args[0] ?? ''
  if (!url) {
    ctx.fail('MISSING_REQUIRED', 'dna requiere una URL', 'netrunner dna <url>', 2)
  }
  try {
    // fetcher local con timeout (fetch nativo de Bun, determinista, sin browser)
    const fetcher = async (u: string): Promise<string> => {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 5_000)
      try {
        const res = await fetch(u, { signal: ctrl.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.text()
      } finally {
        clearTimeout(timer)
      }
    }
    const result = await dnaScan(url, fetcher)
    ctx.emit(result, ctx.human)
    process.exit(0)
  } catch (e) {
    ctx.fail('DNA_FAILED', `no se pudo extraer el ADN: ${(e as Error).message}`, 'verifica la URL y la conexión', 1)
  }
}
