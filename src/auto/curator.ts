/**
 * rol: Deterministic Netrunner curator (DEC-001 point 4 — central differentiator).
 * SELF-IMPROVEMENT with EXTERNAL signal (real-world usage observations), NEVER
 * self-critique (forbidden by Mandamiento 8). PURE function: receives observations,
 * returns deterministic actions. No I/O (the caller decides what to persist).
 *
 * SPEC (Mandamiento 0):
 *   As the Netrunner engine,
 *   I want to self-improve with external signal (usage/success/stale),
 *   so that the contract skills stay up to date without "thinking it's fine".
 *
 * AC (features/curator.feature):
 *   AC-1 curate() is PURE and returns deterministic actions.
 *   AC-2 stale → mark needs_review (NEVER deletes).
 *   AC-3 successful usage → upsert_skill (Memento-Skill).
 *   AC-4 idempotent.
 *   AC-5 empty signal → no-op.
 */

import { shouldUpsert } from './gate'

/** World observation (external usage signal, not self-report). */
export interface Observation {
  tipo: 'usage' | 'stale'
  symbol: string
  ok: boolean
  veces: number
}

/** Deterministic action returned by the curator. */
export type CurateAction =
  | { type: 'upsert_skill'; skill: string }
  | { type: 'mark_review'; symbol: string }

/** rol: converts an observation into an action (deterministic, PURE). */
function actionFor(o: Observation): CurateAction | null {
  if (o.tipo === 'stale' || (!o.ok && o.veces === 0)) {
    // stale → mark, never delete (AC-2)
    return { type: 'mark_review', symbol: o.symbol }
  }
  if (shouldUpsert({ ok: o.ok, veces: o.veces })) {
    // successful usage with clear signal (gate: ok && veces >= 3) → upsert skill (AC-3)
    return { type: 'upsert_skill', skill: `memento-${o.symbol.toLowerCase()}.md` }
  }
  return null
}

/** rol: curates the observations and returns deterministic actions (AC-1..5). */
export function curate(observations: Observation[]): CurateAction[] {
  if (!Array.isArray(observations) || observations.length === 0) return [] // AC-5
  const out: CurateAction[] = []
  for (const o of observations) {
    const a = actionFor(o)
    if (a) out.push(a)
  }
  return out
}
