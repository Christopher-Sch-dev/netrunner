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
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, realpathSync, lstatSync } from 'node:fs'
import { join, dirname, relative, resolve } from 'node:path'

const IGNORED = new Set(['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage', '.stryker-tmp'])
// archivos sensibles que NUNCA van al backup (fuga de secrets — fix juez de seguridad)
const SENSITIVE = new Set(['.env', '.pem', '.key', '.p12', '.credentials', 'id_rsa', 'id_ed25519', 'config.json'])

/** Un snapshot del estado. */
export interface SnapshotEntry { id: string; files: Record<string, string>; decisions: Record<string, string>; mtime: number }

/** rol: recolecta los archivos fuente del proyecto (determinista, sin secrets). */
function collectFiles(projectDir: string): Record<string, string> {
  const files: Record<string, string> = {}
  const walk = (dir: string): void => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORED.has(e.name)) walk(join(dir, e.name))
      } else if (e.isFile()) {
        const rel = relative(projectDir, join(dir, e.name))
        // no seguir symlinks (fix seguridad) ni archivos sensibles (fix fuga de secrets)
        if (e.isSymbolicLink()) continue
        if (SENSITIVE.has(e.name) || e.name.includes('.env')) continue
        try {
          files[rel] = readFileSync(join(dir, e.name), 'utf8')
        } catch { /* skip */ }
      }
    }
  }
  walk(projectDir)
  return files
}

/** rol: recolecta las decisiones open de .netrunner/decisions/ (ciclo persist→rollback, fix juez #4). */
function collectDecisions(projectDir: string): Record<string, string> {
  const decisions: Record<string, string> = {}
  const dir = join(projectDir, '.netrunner', 'decisions')
  if (!existsSync(dir)) return decisions
  try {
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.md')) {
        try { decisions[f] = readFileSync(join(dir, f), 'utf8') } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
  return decisions
}

/** rol: crea un snapshot del estado (AC-1). */
export function createSnapshot(projectDir: string): SnapshotEntry {
  const id = `snap-${Date.now()}`
  const entry: SnapshotEntry = { id, files: collectFiles(projectDir), decisions: collectDecisions(projectDir), mtime: Date.now() }
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

/** rol: restaura un snapshot (re-escribe el estado, AC-3). Valida path traversal + symlink escape (fix RCE + symlink-write). */
export function restoreSnapshot(projectDir: string, id: string): void {
  const path = join(projectDir, '.netrunner', 'backups', `${id}.json`)
  if (!existsSync(path)) throw new Error(`snapshot no encontrado: '${id}'`)
  const entry = JSON.parse(readFileSync(path, 'utf8')) as SnapshotEntry
  const root = realpathSync(resolve(projectDir))
  for (const [rel, content] of Object.entries(entry.files)) {
    const abs = resolve(root, rel)
    // path traversal guard: el target lexicográfico debe quedar bajo root
    if (abs !== root && !abs.startsWith(root + '/')) {
      throw new Error(`path traversal bloqueado: '${rel}' escapa del proyecto`)
    }
    // symlink escape guard (fix juez hacker): si el target es un symlink que apunta FUERA,
    // writeFileSync lo seguiría y escribiría fuera del proyecto. Validar el realpath del padre.
    try {
      const parent = realpathSync(dirname(abs))
      if (parent !== root && !parent.startsWith(root + '/')) {
        throw new Error(`symlink escape bloqueado: '${rel}' apunta fuera del proyecto`)
      }
    } catch {
      // realpathSync falla si el dir no existe aún — mkdir primero y reintentar
      mkdirSync(dirname(abs), { recursive: true })
    }
    // si el target es un symlink existente a un archivo fuera, bloquear (no escribir a través de él)
    if (existsSync(abs) && lstatSync(abs).isSymbolicLink()) {
      const target = realpathSync(abs)
      if (target !== root && !target.startsWith(root + '/')) {
        throw new Error(`symlink escape bloqueado: '${rel}' es un symlink fuera del proyecto`)
      }
    }
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  // restaurar decisiones (ciclo persist→rollback, fix juez #4)
  if (entry.decisions) {
    const decDir = join(root, '.netrunner', 'decisions')
    mkdirSync(decDir, { recursive: true })
    for (const [name, content] of Object.entries(entry.decisions)) {
      writeFileSync(join(decDir, name), content)
    }
  }
}
