/**
 * rol: Curator determinista de Netrunner (DEC-001 punto 4 — diferenciador central).
 * AUTO-MEJORA con señal EXTERNA (observaciones del mundo real de uso), NUNCA
 * auto-crítica (prohibido por Mandamiento 8). Función PURE: recibe observaciones,
 * devuelve acciones deterministas. Sin I/O (el caller decide qué persistir).
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero auto-mejorarme con señal externa (uso/éxito/stale),
 *   para que las skills del contrato se mantengan actualizadas sin "pensar que está bien".
 *
 * AC (features/curator.feature):
 *   AC-1 curate() es PURE y devuelve acciones deterministas.
 *   AC-2 stale → mark needs_review (NUNCA borra).
 *   AC-3 uso exitoso → upsert_skill (Memento-Skill).
 *   AC-4 idempotente.
 *   AC-5 señal vacía → no-op.
 */

import { shouldUpsert } from './gate'

/** Observación del mundo (señal externa de uso, no auto-reporte). */
export interface Observation {
  tipo: 'usage' | 'stale'
  symbol: string
  ok: boolean
  veces: number
}

/** Acción determinista devuelta por el curator. */
export type CurateAction =
  | { type: 'upsert_skill'; skill: string }
  | { type: 'mark_review'; symbol: string }

/** rol: convierte una observación en una acción (determinista, PURE). */
function actionFor(o: Observation): CurateAction | null {
  if (o.tipo === 'stale' || (!o.ok && o.veces === 0)) {
    // stale → mark, nunca delete (AC-2)
    return { type: 'mark_review', symbol: o.symbol }
  }
  if (shouldUpsert({ ok: o.ok, veces: o.veces })) {
    // uso exitoso con señal clara (gate: ok && veces >= 3) → upsert skill (AC-3)
    return { type: 'upsert_skill', skill: `memento-${o.symbol.toLowerCase()}.md` }
  }
  return null
}

/** rol: curate las observaciones y devuelve acciones deterministas (AC-1..5). */
export function curate(observations: Observation[]): CurateAction[] {
  if (!Array.isArray(observations) || observations.length === 0) return [] // AC-5
  const out: CurateAction[] = []
  for (const o of observations) {
    const a = actionFor(o)
    if (a) out.push(a)
  }
  return out
}
