/**
 * rol: watchdog — vigilar cambios y notificar (features/watchdog.feature).
 * LA VISION (gap señalado por Cris): la memoria viva se mantiene — el agente se
 * entera de cambios sin consultar. Detecta cambios desde el último check (mtime
 * de archivos) y emite señal 'cambio' via hooks.
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero que un watchdog vigile los cambios y emita señales,
 *   para que la memoria viva se mantenga.
 *
 * AC (features/watchdog.feature):
 *   AC-1 watchdogCheck(dir) → detecta cambios desde el último check.
 *   AC-2 si hay cambios → emite señal 'cambio'.
 *   AC-3 sin cambios → no emite.
 *   AC-4 determinista.
 */
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { emitSignal } from '../hooks/index'

const STATE_FILE = '.netrunner/watchdog-state.json'

/** rol: mtime máximo de los archivos fuente (determinista). */
function maxMtime(projectDir: string): number {
  let max = 0
  const walk = (dir: string): void => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage'].includes(e.name)) walk(join(dir, e.name))
      } else if (e.isFile()) {
        try { max = Math.max(max, statSync(join(dir, e.name)).mtimeMs) } catch { /* skip */ }
      }
    }
  }
  walk(projectDir)
  return max
}

/** rol: vigila cambios y emite señal si hay (AC-1..4). */
export function watchdogCheck(projectDir: string): { changed: boolean } {
  const statePath = join(projectDir, STATE_FILE)
  const current = maxMtime(projectDir)
  let last = 0
  if (existsSync(statePath)) {
    try { last = Number(readFileSync(statePath, 'utf8')) } catch { last = 0 }
  }
  // guardar el estado actual
  mkdirSync(dirname(statePath), { recursive: true })
  writeFileSync(statePath, String(current))
  // si hay cambios desde el último check → señal
  if (last > 0 && current > last) {
    emitSignal(projectDir, 'cambio', 'se detectaron cambios en el proyecto')
    return { changed: true }
  }
  return { changed: false }
}
