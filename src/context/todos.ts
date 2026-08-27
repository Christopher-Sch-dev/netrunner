/**
 * rol: Detector de pendientes (TODO/FIXME) de Netrunner (Wave 6 — skill auto-generante).
 * Escanea los comentarios TODO/FIXME en el código fuente del proyecto. Es la base
 * de la feature de Cris: "pendientes".
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero conocer los pendientes (TODO/FIXME),
 *   para que la skill auto-generante documente qué falta.
 *
 * AC (features/dirs-todos.feature):
 *   AC-2 todosInfo(dir) → { todos: [{ file, line, tag, text }] }.
 *   AC-3 sin TODOs → [] (no falla).
 *   AC-4 detecta TODO/FIXME en comentarios de código.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'])
const IGNORED = new Set(['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage', '.stryker-tmp'])

/** Un pendiente detectado. */
export interface Todo {
  file: string
  line: number
  tag: string
  text: string
}

/** rol: escanea TODO/FIXME en los archivos fuente (determinista). */
export function todosInfo(projectDir: string): { todos: Todo[] } {
  const todos: Todo[] = []
  const walk = (dir: string): void => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORED.has(e.name)) walk(join(dir, e.name))
      } else if (e.isFile() && EXT.has(extname(e.name))) {
        try {
          const lines = readFileSync(join(dir, e.name), 'utf8').split('\n')
          lines.forEach((line, i) => {
            const m = line.match(/(TODO|FIXME)\s*:?\s*(.*)/i)
            if (m) todos.push({ file: relative(projectDir, join(dir, e.name)), line: i + 1, tag: m[1].toUpperCase(), text: m[2] })
          })
        } catch { /* archivo ilegible → skip */ }
      }
    }
  }
  walk(projectDir)
  return { todos }
}
