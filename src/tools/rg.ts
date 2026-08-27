/**
 * rol: Conector ripgrep de Netrunner (AC-4 ops deterministas, AC-6).
 * Busca texto/patrones en el proyecto con `rg --json` (determinista, respeta
 * .gitignore, rápido). Es una ToolSpec del contrato (`search.rg`, family read,
 * readOnly) registrada en graphAndStackTools → cualquier vista la proyecta.
 *
 * SPEC (Mandamiento 0):
 *   Como netrunner, quiero buscar patrones en el proyecto con ripgrep,
 *   para que el agente encuentre usos/referencias sin leer archivos masivos,
 *   de forma determinista y sin quemar tokens.
 *
 * AC (features/rg.feature):
 *   AC-1 rgSearch(pattern, dir) → matches tipados {file,line,column,text}.
 *   AC-2 respeta .gitignore (no indexa node_modules).
 *   AC-3 es ToolSpec del contrato (search.rg, family read).
 *   AC-4 acota el output a LIMIT matches (TOON).
 */
import { spawn } from 'node:child_process'
import type { ToolSpec, ToolContext } from '../core/registry'

/** rol: match tipado de ripgrep. */
export interface RgMatch {
  file: string
  line: number
  column: number
  text: string
}

/** Límite de matches devueltos (TOON, AC-4). */
const LIMIT = 200

/** rol: ejecuta `rg --json` y devuelve matches tipados, respetando ignore files. */
export function rgSearch(pattern: string, projectDir: string, limit = LIMIT): Promise<RgMatch[]> {
  return new Promise((resolve, reject) => {
    // --glob '!node_modules/**' excluye node_modules determinista (AC-2), sin depender de
    // que ripgrep detecte un repo git (rg solo respeta .gitignore si hay .git).
    const child = spawn('rg', ['--json', '--no-heading', '--max-count', '50', '--glob', '!node_modules/**', pattern], { cwd: projectDir, stdio: ['ignore', 'pipe', 'ignore'] })
    let stdout = ''
    child.stdout.on('data', (c) => { stdout += c })
    child.on('close', (code) => {
      if (code !== 0 && code !== 1) {
        reject(new Error(`rg exited ${code}`))
        return
      }
      const matches: RgMatch[] = []
      for (const line of stdout.split('\n')) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line)
          if (obj.type === 'match' && obj.data) {
            matches.push({ file: obj.data.path?.text ?? '', line: obj.data.line_number ?? 0, column: 0, text: obj.data.lines?.text ?? '' })
          }
        } catch { /* salta líneas no JSON (header/footer de rg) */ }
        if (matches.length >= limit) break
      }
      resolve(matches)
    })
  })
}

/** rol: spec de la tool search.rg (family read, readOnly, DI projectDir). */
export function rgTool(): ToolSpec {
  return {
    id: 'search.rg',
    description: 'Busca un patrón en el proyecto con ripgrep (respeta .gitignore, acotado).',
    family: 'graph', // es una tool de comprensión del código, como explore → toolset graph
    readOnly: true,
    capabilities: ['explore'],
    inputSchema: { pattern: { type: 'string' }, limit: { type: 'integer', default: 120 } },
    execute: async (input: Record<string, unknown>, ctx: ToolContext) => {
      const matches = await rgSearch(String(input.pattern), ctx.projectDir, Number(input.limit ?? LIMIT))
      return { ok: true, matches }
    },
  }
}
