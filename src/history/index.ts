/**
 * rol: history — memoria de operaciones del agente (AC-H1/H2 de features/vision.feature).
 * LA VISION: cada comando exitoso apende su operación a .netrunner/history.log, y
 * `netrunner history` las devuelve. Es el "se adhiere a la cabeza del agente":
 * el agente recuerda qué hizo y qué puede hacer (observar/decidir).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero recordar qué operaciones hice y verlas con `history`,
 *   para decidir/observar sin re-explorar desde cero.
 *
 * AC (features/vision.feature):
 *   AC-H1 history(projectDir) → últimas operaciones (timestamp | command | status).
 *   AC-H2 logOperation(projectDir, command) apende al history (auto-observabilidad).
 */
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

/** Una operación del history. */
export interface HistoryEntry { timestamp: number; command: string; status: string }

const HISTORY_FILE = '.netrunner/history.log'

/** rol: apende una operación al history (AC-H2, auto-observabilidad). */
export function logOperation(projectDir: string, command: string, status = 'ok'): void {
  try {
    const path = join(projectDir, HISTORY_FILE)
    mkdirSync(dirname(path), { recursive: true })
    appendFileSync(path, `${Date.now()}\t${command}\t${status}\n`)
  } catch { /* history no crítico — no rompe la operación */ }
}

/** rol: devuelve las últimas operaciones (AC-H1). */
export function history(projectDir: string, limit = 20): { operations: HistoryEntry[] } {
  const path = join(projectDir, HISTORY_FILE)
  if (!existsSync(path)) return { operations: [] }
  try {
    const lines = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean)
    const operations = lines.slice(-limit).map((line) => {
      const [ts, command, status] = line.split('\t')
      return { timestamp: Number(ts), command, status: status ?? 'ok' }
    }).reverse()
    return { operations }
  } catch {
    return { operations: [] }
  }
}
