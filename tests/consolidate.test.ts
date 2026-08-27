import { describe, it, expect } from 'vitest'
import { consolidateMementos, rememberRejected, isRejected } from '../src/auto/consolidate'

// rol: tests de consolidación + rejected-buffer (AC-1..4 de features/consolidate.feature).
// Evita drift de la auto-mejora (validador #3, robar de SkillOpt).

describe('consolidación de Mementos + rejected-buffer', () => {
  it('consolida Mementos duplicados del mismo símbolo (AC-1)', () => {
    const mementos = [
      { symbol: 'login', skill: 'login-v1', ok: true, veces: 3 },
      { symbol: 'login', skill: 'login-v2', ok: true, veces: 5 },
      { symbol: 'auth', skill: 'auth-v1', ok: true, veces: 2 },
    ]

    const consolidated = consolidateMementos(mementos)

    // login consolidado en uno, auth intacto
    expect(consolidated.length).toBe(2)
    const login = consolidated.find((m) => m.symbol === 'login')
    expect(login).toBeDefined()
    expect(login!.veces).toBe(8) // 3 + 5
  })

  it('rejected-buffer recuerda símbolos rechazados (AC-2/3)', () => {
    const rejected: string[] = []
    rememberRejected(rejected, 'login')
    expect(isRejected(rejected, 'login')).toBe(true)
    expect(isRejected(rejected, 'auth')).toBe(false)
  })

  it('sin mementos → []; sin rechazados → false (AC-4)', () => {
    expect(consolidateMementos([])).toEqual([])
    expect(isRejected([], 'login')).toBe(false)
  })
})
