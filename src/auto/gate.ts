/**
 * rol: Gate de validación del curator (riesgo #1 del Juez 2 — robar de SkillOpt).
 * El curator acepta un Memento-Skill SOLO si tiene señal externa clara
 * (ok && veces >= umbral). Un Memento malo no se propaga (el caso ungated de
 * SkillOpt cayó de 55.4%→2.6%).
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero que el curator acepte un Memento solo con señal externa clara,
 *   para que un Memento malo no se propague.
 *
 * AC (features/gate.feature):
 *   AC-1 shouldUpsert → true solo si ok && veces >= umbral.
 *   AC-2 ok=false → false.
 *   AC-3 veces < umbral → false.
 *   AC-4 umbral default 3.
 */

/** Observación de uso del curator. */
export interface GateObservation {
  ok: boolean
  veces: number
}

/** rol: decide si el curator debe upsertear un Memento (AC-1..4). */
export function shouldUpsert(obs: GateObservation, umbral = 3): boolean {
  return obs.ok && obs.veces >= umbral
}
