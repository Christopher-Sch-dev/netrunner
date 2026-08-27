/**
 * rol: Netrunner pending-items (TODO/FIXME) detector (Wave 6 — self-generating skill).
 * Scans the TODO/FIXME comments in the project source code. It is the basis
 * of the pending-items feature.
 *
 * SPEC (Mandamiento 0):
 *   As an agent operating a Netrunner project,
 *   I want to know the pending items (TODO/FIXME),
 *   so that the self-generating skill documents what is missing.
 *
 * AC (features/dirs-todos.feature):
 *   AC-2 todosInfo(dir) → { todos: [{ file, line, tag, text }] }.
 *   AC-3 no TODOs → [] (does not fail).
 *   AC-4 detects TODO/FIXME in code comments.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'])
const IGNORED = new Set(['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage', '.stryker-tmp'])

/** A detected pending item. */
export interface Todo {
  file: string
  line: number
  tag: string
  text: string
}

/** rol: scans TODO/FIXME in the source files (deterministic). */
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
        } catch { /* unreadable file → skip */ }
      }
    }
  }
  walk(projectDir)
  return { todos }
}
