/**
 * rol: Netrunner directory tree detector (Wave 6 — self-generating skill).
 * Returns the project folder structure (up to depth 3), excluding
 * node_modules/.git/.netrunner. It is the basis of the folders feature:
 * subfolders".
 *
 * SPEC (Mandamiento 0):
 *   As an agent operating a Netrunner project,
 *   I want to know the directory tree,
 *   so that the self-generating skill documents the structure.
 *
 * AC (features/dirs-todos.feature):
 *   AC-1 dirsTree(dir) → string[] (relative folder paths).
 *   AC-2 excludes node_modules/.git/.netrunner.
 *   AC-3 no dirs → [] (does not fail).
 */
import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const IGNORED = new Set(['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage', '.stryker-tmp'])

/** rol: returns the directory tree (up to depth 3, excludes noise). */
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
