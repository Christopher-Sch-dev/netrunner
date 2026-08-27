/**
 * rol: Detector de árbol de directorios de Netrunner (Wave 6 — skill auto-generante).
 * Devuelve la estructura de carpetas del proyecto (hasta depth 3), excluyendo
 * node_modules/.git/.netrunner. Es la base de la feature de Cris: "carpetas,
 * subcarpetas".
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero conocer el árbol de directorios,
 *   para que la skill auto-generante documente la estructura.
 *
 * AC (features/dirs-todos.feature):
 *   AC-1 dirsTree(dir) → string[] (rutas relativas de carpetas).
 *   AC-2 excluye node_modules/.git/.netrunner.
 *   AC-3 sin dirs → [] (no falla).
 */
import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const IGNORED = new Set(['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage', '.stryker-tmp'])

/** rol: devuelve el árbol de directorios (hasta depth 3, excluye ruido). */
export function dirsTree(projectDir: string, depth = 3): string[] {
  const out: string[] = []
  const walk = (dir: string, d: number): void => {
    if (d > depth) return
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (!e.isDirectory() || IGNORED.has(e.name)) continue
      const abs = join(dir, e.name)
      const rel = relative(projectDir, abs)
      out.push(rel)
      walk(abs, d + 1)
    }
  }
  walk(projectDir, 1)
  return out
}
