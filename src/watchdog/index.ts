/**
 * rol: watchdog — vigilar cambios y notificar (features/watchdog.feature + watchdog-event.feature).
 * LA VISION (gap señalado por Cris): la memoria viva se mantiene — el agente se
 * entera de cambios sin consultar. Dos modos:
 *   - watchProject: file watcher REAL (fs.watch recursivo) — emite señal 'cambio'
 *     en TIEMPO REAL cuando un archivo cambia (sin polling). Wave F2.
 *   - watchdogCheck: mtime-polling (compatibilidad con el daemon, AC-6).
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
 *
 * AC (features/watchdog-event.feature):
 *   AC-1 watchProject(dir, opts) inicia un file watcher real (fs.watch recursivo).
 *   AC-2 al cambiar un archivo → emite señal 'cambio' en tiempo real (no polling).
 *   AC-3 ignora ruido (node_modules, .git, .netrunner, dist, build, coverage).
 *   AC-4 debounce — una ráfaga de eventos emite UNA señal.
 *   AC-5 close() detiene el watcher.
 *   AC-6 watchdogCheck se conserva para compatibilidad con el daemon.
 */
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync, watch } from 'node:fs'
import { join, dirname, sep } from 'node:path'
import { emitSignal } from '../hooks/index'

const STATE_FILE = '.netrunner/watchdog-state.json'

/** rol: directorios que no interesan al watchdog (ruido, AC-3). */
const IGNORED_DIRS = ['node_modules', '.git', '.netrunner', 'dist', 'build', 'coverage']

/** Opciones de watchProject. */
export interface WatchProjectOptions {
  /** rol: ventana de debounce en ms (AC-4). Default 100. */
  debounceMs?: number
}

/** rol: handle para detener el watcher (AC-5). */
export interface WatchHandle {
  close(): void
}

/** rol: mtime máximo de los archivos fuente (determinista, AC-4). */
function maxMtime(projectDir: string): number {
  let max = 0
  const walk = (dir: string): void => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!IGNORED_DIRS.includes(e.name)) walk(join(dir, e.name))
      } else if (e.isFile()) {
        try { max = Math.max(max, statSync(join(dir, e.name)).mtimeMs) } catch { /* skip */ }
      }
    }
  }
  walk(projectDir)
  return max
}

/** rol: vigila cambios y emite señal si hay (AC-1..4 de watchdog.feature). */
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

/**
 * rol: file watcher real (fs.watch recursivo) — emite señal 'cambio' en tiempo real
 * cuando un archivo cambia (AC-1..5 de watchdog-event.feature). Sin polling.
 */
export function watchProject(projectDir: string, opts: WatchProjectOptions = {}): WatchHandle {
  const debounceMs = opts.debounceMs ?? 100
  let timer: ReturnType<typeof setTimeout> | null = null
  let closed = false

  const watcher = watch(projectDir, { recursive: true }, (eventType, filename) => {
    if (closed) return
    if (typeof filename !== 'string') return
    // ignora ruido (AC-3): si algún segmento del path es un dir ignorado
    if (filename.split(sep).some((seg) => IGNORED_DIRS.includes(seg))) return
    // debounce (AC-4): una ráfaga de eventos → UNA señal
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (closed) return
      emitSignal(projectDir, 'cambio', `se detectó un cambio en ${filename}`)
    }, debounceMs)
  })

  return {
    close(): void {
      closed = true
      if (timer) clearTimeout(timer)
      watcher.close()
    },
  }
}
