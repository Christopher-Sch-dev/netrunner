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
    ctx.fail('MISSING_REQUIRED', 'extract requires a URL', 'netrunner extract <url>', 2)
  }
  try {
    const result = await extractWeb(url)
    ctx.emit(result, ctx.human)
    process.exit(0)
  } catch (e) {
    ctx.fail('EXTRACT_FAILED', `could not extract: ${(e as Error).message}`, 'check the URL and your connection', 1)
  }
}

/** rol: netrunner inspect <url> — consola/red/perf/a11y de una web (CDP DI o fetch local). */
export async function inspect(ctx: HandlerContext): Promise<void> {
  const { inspectWeb } = await import('../../web/inspect')
  const url = ctx.args[0] ?? ''
  if (!url) {
    ctx.fail('MISSING_REQUIRED', 'inspect requires a URL', 'netrunner inspect <url>', 2)
  }
  try {
    const result = await inspectWeb(url)
    ctx.emit(result, ctx.human)
    process.exit(0)
  } catch (e) {
    ctx.fail('INSPECT_FAILED', `could not inspect: ${(e as Error).message}`, 'check the URL and your connection', 1)
  }
}

/** rol: netrunner dna <url> — extrae el ADN de diseño determinista de una web. */
export async function dna(ctx: HandlerContext): Promise<void> {
  const { dnaScan } = await import('../../dna/index')
  const url = ctx.args[0] ?? ''
  if (!url) {
    ctx.fail('MISSING_REQUIRED', 'dna requires a URL', 'netrunner dna <url>', 2)
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
    // P7.2: emisores DTCG — --brief (design.md), --css (variables.css), --json (design-tokens.json)
    // markdown/css son TEXTO PLANO (no JSON) — emitir con human=true para no esparcir el string
    // en caracteres (bug: JSON.stringify(string) → {"0":"#","1":" "...}).
    if (ctx.flags?.brief) {
      const { emitDesignMd } = await import('../../dna/dtcg')
      ctx.emit(emitDesignMd(result), true)
    } else if (ctx.flags?.css) {
      const { emitVariablesCss } = await import('../../dna/dtcg')
      ctx.emit(emitVariablesCss(result), true)
    } else if (ctx.flags?.json) {
      const { emitDesignTokensJson } = await import('../../dna/dtcg')
      ctx.emit(emitDesignTokensJson(result), ctx.human)
    } else {
      ctx.emit(result, ctx.human)
    }
    process.exit(0)
  } catch (e) {
    ctx.fail('DNA_FAILED', `could not extract the DNA: ${(e as Error).message}`, 'check the URL and your connection', 1)
  }
}
