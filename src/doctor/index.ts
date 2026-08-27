/**
 * rol: doctor — self-check del deck (fix juez de producto: lint existe pero invisible).
 * Combina los checks existentes en un solo diagnóstico: lint (health del snapshot),
 * guard (secrets/imports rotos) y canonStale (canon pendiente). El agente ve de un
 * vistazo la salud del proyecto.
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero un self-check que combine lint + guard + canonStale,
 *   para ver de un vistazo la salud del deck.
 *
 * AC:
 *   AC-1 doctor(dir) → { healthy, lint, guard, canonStale }.
 *   AC-2 healthy = sin issues de lint ni guard + canon al día.
 *   AC-3 reusa los checks existentes (no duplica lógica).
 */
import { buildSnapshot } from '../context/snapshot'
import { lintSnapshot } from '../auto/lint'
import { guardCheck } from '../guard/index'
import { canonStale } from '../canon/stale'

/** rol: self-check del deck (AC-1..3). */
export async function doctor(projectDir: string): Promise<{
  healthy: boolean
  lint: { issues: Array<{ type: string; message: string }> }
  guard: { ok: boolean; issues: Array<{ file: string; reason: string }> }
  canonStale: boolean
}> {
  const snap = await buildSnapshot(projectDir)
  const lint = lintSnapshot(snap as never)
  const guard = guardCheck(projectDir)
  const stale = canonStale(projectDir)
  const healthy = lint.issues.length === 0 && guard.ok && !stale
  return { healthy, lint, guard, canonStale: stale }
}
