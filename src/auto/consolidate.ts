/**
 * rol: Consolidación de Mementos + rejected-buffer (validador #3, robar de SkillOpt).
 * Evita drift de la auto-mejora: consolida Mementos-Skills duplicadas del mismo
 * símbolo y recuerda los rechazados (memoria negativa — no repetir errores).
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero consolidar Mementos duplicados y recordar los rechazados,
 *   para que la auto-mejora no drifte.
 *
 * AC (features/consolidate.feature):
 *   AC-1 consolidateMementos agrupa duplicados (mismo símbolo).
 *   AC-2 rememberRejected agrega al buffer de rechazados.
 *   AC-3 isRejected devuelve true si fue rechazado.
 *   AC-4 sin mementos → []; sin rechazados → false.
 */

/** Un Memento-Skill (observación de uso exitoso). */
export interface Memento {
  symbol: string
  skill: string
  ok: boolean
  veces: number
}

/** rol: consolida Mementos duplicados del mismo símbolo (AC-1). */
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

/** rol: agrega un símbolo al buffer de rechazados (AC-2). */
export function rememberRejected(rejected: string[], symbol: string): void {
  if (!rejected.includes(symbol)) rejected.push(symbol)
}

/** rol: devuelve true si el símbolo fue rechazado antes (AC-3). */
export function isRejected(rejected: string[], symbol: string): boolean {
  return rejected.includes(symbol)
}
