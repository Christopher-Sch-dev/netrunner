/**
 * rol: harvest — convierte events.log en observaciones reales para el curator (features/daemon-senal.feature).
 * LA VISION: el "curator fantasma" de Rache Bartmoss deja de ser un esqueleto sin datos.
 * El daemon alimenta al curator con observaciones REALES (ops exitosas/fallidas) ancladas
 * a señal externa (events.log), no a auto-crítica.
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero que el daemon alimente al curator con observaciones reales,
 *   para que la auto-mejora se ancle a señal externa real.
 *
 * AC (features/daemon-senal.feature):
 *   AC-1 harvest(dir) convierte events.log en Observation[].
 *   AC-2 op/result ok → usage ok=true.
 *   AC-3 op/error → usage ok=false.
 *   AC-5 sin events → [].
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Observation } from '../auto/curator'

const EVENTS_FILE = '.netrunner/events.log'

/** rol: convierte events.log en observaciones de uso (AC-1..3). */
export function harvest(projectDir: string): Observation[] {
  const path = join(projectDir, EVENTS_FILE)
  if (!existsSync(path)) return [] // AC-5
  try {
    const lines = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean)
    const obs: Observation[] = []
    for (const line of lines) {
      try {
        const ev = JSON.parse(line) as { type: string; tool: string; ok?: boolean }
        if (ev.type === 'op/result' || ev.type === 'op/error') {
          // símbolo = la tool (op.test → test)
          const symbol = ev.tool.replace(/^op\./, '')
          obs.push({ tipo: 'usage', symbol, ok: ev.ok ?? false, veces: 1 })
        }
      } catch { /* línea corrupta → skip */ }
    }
    return obs
  } catch {
    return []
  }
}
