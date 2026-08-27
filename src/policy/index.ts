/**
 * rol: Policy cross-client de Netrunner (DEC-001 — parity cross-agent).
 * Decide si una intención es permitida según el contexto, de forma PURE y
 * determinista: la MISMA intención + MISMO contexto = MISMA decisión, sin
 * importar qué agente (opencode/claude/codex/hermes) la invoque. FAIL-CLOSED:
 * contexto ausente → deny (Mandamiento 7).
 *
 * SPEC (Mandamiento 0):
 *   Como un proyecto Netrunner con tools mutating,
 *   quiero una policy central que decida permisos,
 *   para que la MISMA intención produzca el MISMO resultado en cualquier agente.
 *
 * AC (features/policy.feature):
 *   AC-1 PURE + determinista (parity cross-agent).
 *   AC-2 read-only → allow; mutating sin approval → deny.
 *   AC-3 reglas declarativas (transversales, no per-agente).
 *   AC-4 sin contexto → deny (fail-closed).
 */

/** Contexto de la llamada (lo que la policy evalúa, independiente del agente). */
export interface PolicyContext {
  readOnly: boolean
  approval: boolean
}

/** Intenciones que el motor reconoce. */
export type Intent = 'explore' | 'edit' | 'destroy' | string

/** Decisión determinista. */
export type Decision = 'allow' | 'deny'

/** rol: decide si la intención está permitida en el contexto (PURE, fail-closed). */
export function evaluatePolicy(_intent: Intent, ctx: PolicyContext): Decision {
  if (!ctx || typeof ctx !== 'object') return 'deny' // fail-closed (AC-4)
  if (ctx.readOnly) return 'allow' // lectura siempre permitida (AC-2)
  // mutating: requiere approval explícito
  return ctx.approval ? 'allow' : 'deny' // (AC-2/3)
}
