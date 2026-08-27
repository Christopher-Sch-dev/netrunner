/**
 * rol: hooks — señal al agente conectado (features/hooks.feature).
 * LA VISION (gap señalado por Cris): el motor debe "mandar información a la gente
 * con el que está conectado" — si el canon requiere actualización o hubo un cambio,
 * el agente lo sabe proactivamente (no tiene que consultar). Persiste señales en
 * .netrunner/signals.log; el agente las lee con pendingSignals y las marca leídas.
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero que cada operación emita una señal al agente conectado,
 *   para que sepa proactivamente si necesita actualizar documentación o hacer algo.
 *
 * AC (features/hooks.feature):
 *   AC-1 emitSignal(dir, type, message) persiste una señal.
 *   AC-2 pendingSignals(dir) → señales no leídas.
 *   AC-3 markSignalsRead(dir) → marca como leídas.
 *   AC-4 sin señales → [].
 */
import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const SIGNALS_FILE = '.netrunner/signals.log'

/** Una señal. */
export interface Signal { type: string; message: string; ts: number; read: boolean }

/** rol: emite una señal al agente conectado (AC-1). */
export function emitSignal(projectDir: string, type: string, message: string): void {
  try {
    const path = join(projectDir, SIGNALS_FILE)
    mkdirSync(dirname(path), { recursive: true })
    appendFileSync(path, JSON.stringify({ type, message, ts: Date.now(), read: false }) + '\n')
  } catch { /* señal no crítica */ }
}

/** rol: señales no leídas (AC-2/4). */
export function pendingSignals(projectDir: string): Signal[] {
  const path = join(projectDir, SIGNALS_FILE)
  if (!existsSync(path)) return []
  try {
    return readFileSync(path, 'utf8').trim().split('\n').filter(Boolean)
      .map((l) => JSON.parse(l) as Signal)
      .filter((s) => !s.read)
  } catch {
    return []
  }
}

/** rol: marca todas las señales como leídas (AC-3). */
export function markSignalsRead(projectDir: string): void {
  const path = join(projectDir, SIGNALS_FILE)
  if (!existsSync(path)) return
  try {
    const signals = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean)
      .map((l) => JSON.parse(l) as Signal)
      .map((s) => ({ ...s, read: true }))
    writeFileSync(path, signals.map((s) => JSON.stringify(s)).join('\n') + '\n')
  } catch { /* no crítico */ }
}
