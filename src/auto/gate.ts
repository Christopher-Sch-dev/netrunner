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

// ─── Gate SkillOpt (features/gate-skillopt.feature, arXiv 2605.23904) ───
// El paper SkillOpt: "an edit is accepted only when it strictly improves a
// held-out validation score. A rejected-edit buffer ... make skill training
// stable." Aceptar un skill SOLO si mejora estrictamente el score held-out
// y no está en el buffer de rechazo (no reintentar edits que no mejoraron).

/** Observación con score de validación held-out (para el gate SkillOpt). */
export interface SkillOptObservation extends GateObservation {
  /** score de validación held-out del skill propuesto (0..1). */
  heldOutScore: number
  /** score del skill previo (0..1). */
  prevScore: number
}

/** Buffer de rechazo: skills que no mejoraron (no se reintentan). */
const rejectBuffer = new Set<string>()

/** rol: agrega un skill al buffer de rechazo (AC-4). */
export function addToRejectBuffer(skill: string): void {
  rejectBuffer.add(skill)
}

/** rol: true si el skill fue rechazado antes (AC-5). */
export function isInRejectBuffer(skill: string): boolean {
  return rejectBuffer.has(skill)
}

/**
 * rol: gate SkillOpt — acepta un skill SOLO si mejora estrictamente el score
 * held-out, tiene señal externa (ok && veces >= threshold), y no está en el
 * buffer de rechazo (AC-1..3, AC-6).
 */
export function shouldUpsertSkillOpt(obs: SkillOptObservation, skill: string, umbral = 3): boolean {
  if (isInRejectBuffer(skill)) return false // AC-3: no reintentar
  if (!obs.ok || obs.veces < umbral) return false // señal externa (AC-1)
  return obs.heldOutScore > obs.prevScore // AC-2: mejora estricta
}
