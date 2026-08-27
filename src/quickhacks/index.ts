/**
 * rol: quickhacks con costo/cooldown (features/quickhacks.feature).
 * LA VISION (mina #8): micro-tools con RAM/costo y throttling. El agente no quema
 * recursos en ops repetidas — cada quickhack tiene costo estimado (tokens/tiempo)
 * y cooldown (no re-correr la misma op en un lapso).
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero que los quickhacks tengan costo y cooldown,
 *   para no quemar recursos en operaciones repetidas.
 *
 * AC (features/quickhacks.feature):
 *   AC-1 quickhackCost(kind) → costo estimado.
 *   AC-2 cooldownCheck(lastRun, cooldownMs) → true si en cooldown.
 *   AC-3 listQuickhacks() → lista con costo + cooldown.
 *   AC-4 determinista.
 */

/** Costo estimado de un quickhack. */
export interface QuickhackCost { tokens: number; ms: number }

/** Costos por kind (determinista, AC-4). */
const COSTS: Record<string, QuickhackCost> = {
  test: { tokens: 200, ms: 5000 },
  build: { tokens: 400, ms: 10000 },
  lint: { tokens: 100, ms: 2000 },
}

/** Cooldown por kind (ms). */
const COOLDOWNS: Record<string, number> = {
  test: 5000,
  build: 15000,
  lint: 3000,
}

/** rol: costo estimado de un quickhack (AC-1). */
export function quickhackCost(kind: string): QuickhackCost {
  return COSTS[kind] ?? { tokens: 150, ms: 3000 }
}

/** rol: true si la op está en cooldown (AC-2). */
export function cooldownCheck(lastRun: number, cooldownMs: number, now = Date.now()): boolean {
  return now - lastRun < cooldownMs
}

/** rol: lista los quickhacks con costo + cooldown (AC-3). */
export function listQuickhacks(): Array<{ kind: string; cost: QuickhackCost; cooldownMs: number }> {
  return Object.keys(COSTS).map((kind) => ({
    kind,
    cost: COSTS[kind],
    cooldownMs: COOLDOWNS[kind] ?? 5000,
  }))
}
