/**
 * rol: Curator validation gate (risk #1 of Juez 2).
 * The curator accepts a Memento-Skill ONLY if it has clear external signal
 * (ok && veces >= threshold). A bad Memento does not propagate (the ungated
 * case dropped from 55.4%→2.6%).
 *
 * SPEC (Mandamiento 0):
 *   As the Netrunner engine,
 *   I want the curator to accept a Memento only with clear external signal,
 *   so that a bad Memento does not propagate.
 *
 * AC (features/gate.feature):
 *   AC-1 shouldUpsert → true only if ok && veces >= threshold.
 *   AC-2 ok=false → false.
 *   AC-3 veces < threshold → false.
 *   AC-4 default threshold 3.
 */

/** Curator usage observation. */
export interface GateObservation {
  ok: boolean
  veces: number
}

/** rol: decides whether the curator should upsert a Memento (AC-1..4). */
export function shouldUpsert(obs: GateObservation, umbral = 3): boolean {
  return obs.ok && obs.veces >= umbral
}
