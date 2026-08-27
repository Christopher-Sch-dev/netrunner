import { describe, it, expect } from 'vitest'
import { quickhackCost, cooldownCheck, listQuickhacks } from '../src/quickhacks/index'

// role: tests for quickhacks con costo/cooldown (AC-1..4 of features/quickhacks.feature).
// El agente no quema recursos en ops repetidas (mina #8: RAM/costo + throttling).

describe('quickhacks con costo/cooldown', () => {
  it('quickhackCost devuelve costo estimado (AC-1)', () => {
    const c = quickhackCost('test')
    expect(c.tokens).toBeGreaterThan(0)
    expect(c.ms).toBeGreaterThan(0)
  })

  it('cooldownCheck: en cooldown → true (AC-2)', () => {
    const now = Date.now()
    expect(cooldownCheck(now - 1000, 5000, now)).toBe(true) // corrió hace 1s, cooldown 5s
  })

  it('cooldownCheck: expirado → false (AC-3)', () => {
    const now = Date.now()
    expect(cooldownCheck(now - 10000, 5000, now)).toBe(false) // corrió hace 10s, cooldown 5s
  })

  it('listQuickhacks lista con costo + cooldown (AC-3)', () => {
    const list = listQuickhacks()
    expect(list.length).toBeGreaterThan(0)
    expect(list[0]).toHaveProperty('kind')
    expect(list[0]).toHaveProperty('cost')
  })
})
