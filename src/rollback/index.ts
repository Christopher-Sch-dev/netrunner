/**
 * rol: rollback — snapshot del estado del proyecto (mina cyberpunk feature #19).
 * Hace backup de los archivos fuente del proyecto y permite restaurarlos, para
 * que antes de un cambio riesgoso el agente pueda volver atrás.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero hacer backup del estado y poder restaurarlo,
 *   para volver atrás antes de un cambio riesgoso.
 *
 * AC (features/rollback.feature):
 *   AC-1 createSnapshot(dir) → guarda en .netrunner/backups/<ts>.json.
 *   AC-2 listSnapshots(dir) → lista backups.
 *   AC-3 restoreSnapshot(dir, id) → re-escribe el estado.
 *   AC-4 sin backups → { snapshots: [] } (no falla).
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'

const IGNORED = new Set(['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage', '.stryker-tmp'])

/** Un snapshot del estado. */
export interface SnapshotEntry { id: string; files: Record<string, string>; mtime: number }

/** rol: recolecta los archivos fuente del proyecto (determinista). */
function collectFiles(projectDir: string): Record<string, string> {
  const files: Record<string, string> = {}
  const walk = (dir: string): void => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORED.has(e.name)) walk(join(dir, e.name))
      } else if (e.isFile()) {
        try {
          files[relative(projectDir, join(dir, e.name))] = readFileSync(join(dir, e.name), 'utf8')
        } catch { /* skip */ }
      }
    }
  }
  walk(projectDir)
  return files
}

/** rol: crea un snapshot del estado (AC-1). */
export function createSnapshot(projectDir: string): SnapshotEntry {
  const id = `snap-${Date.now()}`
  const entry: SnapshotEntry = { id, files: collectFiles(projectDir), mtime: Date.now() }
  const path = join(projectDir, '.netrunner', 'backups', `${id}.json`)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(entry))
  return entry
}

/** rol: lista los snapshots disponibles (AC-2/4). */
export function listSnapshots(projectDir: string): { snapshots: Array<{ id: string; mtime: number }> } {
  const dir = join(projectDir, '.netrunner', 'backups')
  if (!existsSync(dir)) return { snapshots: [] }
  try {
    const snapshots = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const entry = JSON.parse(readFileSync(join(dir, f), 'utf8')) as SnapshotEntry
        return { id: entry.id, mtime: entry.mtime }
      })
      .sort((a, b) => b.mtime - a.mtime)
    return { snapshots }
  } catch {
    return { snapshots: [] }
  }
}

/** rol: restaura un snapshot (re-escribe el estado, AC-3). */
export function restoreSnapshot(projectDir: string, id: string): void {
  const path = join(projectDir, '.netrunner', 'backups', `${id}.json`)
  if (!existsSync(path)) throw new Error(`snapshot no encontrado: '${id}'`)
  const entry = JSON.parse(readFileSync(path, 'utf8')) as SnapshotEntry
  for (const [rel, content] of Object.entries(entry.files)) {
    const abs = join(projectDir, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
}
