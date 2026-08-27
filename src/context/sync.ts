/**
 * rol: Auto-sync del grafo de Netrunner (Fase 3 — uso continuo).
 * El grafo se refresca SOLO cuando cambian los archivos fuente, sin exigir
 * `netrunner init` manual ("no index, no value"). Compara
 * el mtime de los archivos fuente vs el mtime del index.db.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que el grafo se refresque solo cuando cambian los archivos,
 *   para que el agente no tenga que correr init manualmente (uso continuo).
 *
 * AC (features/sync.feature):
 *   AC-1 needsSync(dir) → true si algún archivo fuente cambió.
 *   AC-2 syncIfNeeded(dir) re-indexa solo si needsSync (idempotente).
 *   AC-3 sin index.db → needsSync true.
 *   AC-4 compara mtime de archivos vs index.db.
 */
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'])
const IGNORED = new Set(['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage', '.stryker-tmp'])

/** rol: devuelve el mtime más reciente de los archivos fuente (determinista). */
function latestSourceMtime(projectDir: string): number {
  let latest = 0
  const walk = (dir: string): void => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORED.has(e.name)) walk(join(dir, e.name))
      } else if (e.isFile() && EXT.has(extname(e.name))) {
        try {
          const m = statSync(join(dir, e.name)).mtimeMs
          if (m > latest) latest = m
        } catch { /* skip */ }
      }
    }
  }
  walk(projectDir)
  return latest
}

/** rol: devuelve true si algún archivo fuente cambió desde el último index (AC-1/3). */
export function needsSync(projectDir: string): boolean {
  const dbPath = join(projectDir, '.netrunner', 'index.db')
  if (!existsSync(dbPath)) return true // sin index → hay que indexar (AC-3)
  const dbMtime = statSync(dbPath).mtimeMs
  return latestSourceMtime(projectDir) > dbMtime
}

/** rol: re-indexa solo si cambió (idempotente, AC-2). */
export async function syncIfNeeded(projectDir: string): Promise<{ synced: boolean; nodes: number }> {
  if (!needsSync(projectDir)) return { synced: false, nodes: 0 }
  const { indexProject } = await import('./graph')
  const { nodes } = await indexProject(projectDir, { incremental: true })
  return { synced: true, nodes: nodes.length }
}
