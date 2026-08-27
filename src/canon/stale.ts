/**
 * rol: canonStale — detector de canon desactualizado (canon-vivo señal, features/canon-stale.feature).
 * LA VISION (observación de Cris): el canon NO se reescribe por sistema. En su lugar,
 * Netrunner detecta que el canon está desactualizado y emite una SEÑAL al agente
 * (con markers de sección editable), para que el AGENTE — como humano algorítmico —
 * actualice solo las secciones marcadas, preservando reglas generales.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero saber si el canon de documentación está desactualizado,
 *   para que se emita una señal (no auto-reescritura).
 *
 * AC (features/canon-stale.feature):
 *   AC-1 canonStale(dir) → true si el proyecto cambió (snapshot mtime > README.generated mtime).
 *   AC-2 sin README.generated → true (canon no existe → stale).
 *   AC-3 idempotente/determinista (PURE).
 */
import { existsSync, statSync, readdirSync } from 'node:fs'
import { join, extname } from 'node:path'

const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'])
const IGNORED = new Set(['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage', '.stryker-tmp'])

/** rol: mtime más reciente de los archivos fuente (determinista, ignora internos). */
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

/** rol: true si el canon está desactualizado respecto al proyecto (AC-1/2). */
export function canonStale(projectDir: string): boolean {
  const canonPath = join(projectDir, 'README.generated.md')
  if (!existsSync(canonPath)) return true // sin canon → stale (AC-2)
  const canonMtime = statSync(canonPath).mtimeMs
  // snapshot mtime es proxy del estado: si el proyecto cambió después del canon → stale
  const snapshotPath = join(projectDir, '.netrunner', 'state', 'project.json')
  const stateMtime = existsSync(snapshotPath) ? statSync(snapshotPath).mtimeMs : latestSourceMtime(projectDir)
  return stateMtime > canonMtime
}
