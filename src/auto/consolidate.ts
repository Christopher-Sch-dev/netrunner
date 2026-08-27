/**
 * rol: Memento consolidation + rejected-buffer (validator #3).
 * Prevents self-improvement drift: consolidates duplicate Memento-Skills of the same
 * symbol and remembers rejected ones (negative memory — avoid repeating mistakes).
 *
 * SPEC (Mandamiento 0):
 *   As the Netrunner engine,
 *   I want to consolidate duplicate Mementos and remember rejected ones,
 *   so that self-improvement does not drift.
 *
 * AC (features/consolidate.feature):
 *   AC-1 consolidateMementos groups duplicates (same symbol).
 *   AC-2 rememberRejected adds to the rejected buffer.
 *   AC-3 isRejected returns true if it was rejected.
 *   AC-4 no mementos → []; no rejected → false.
 */

/** A Memento-Skill (observation of successful usage). */
export interface Memento {
  symbol: string
  skill: string
  ok: boolean
  veces: number
}

/** rol: consolidates duplicate Mementos of the same symbol (AC-1). */
export function consolidateMementos(mementos: Memento[]): Memento[] {
  const bySymbol = new Map<string, Memento>()
  for (const m of mementos) {
    const existing = bySymbol.get(m.symbol)
    if (existing) {
      existing.veces += m.veces
      existing.ok = existing.ok && m.ok
      existing.skill = m.skill // el más reciente
    } else {
      bySymbol.set(m.symbol, { ...m })
    }
  }
  return [...bySymbol.values()]
}

/** rol: adds a symbol to the rejected buffer (AC-2). */
export function rememberRejected(rejected: string[], symbol: string): void {
  if (!rejected.includes(symbol)) rejected.push(symbol)
}

/** rol: returns true if the symbol was rejected before (AC-3). */
export function isRejected(rejected: string[], symbol: string): boolean {
  return rejected.includes(symbol)
}
