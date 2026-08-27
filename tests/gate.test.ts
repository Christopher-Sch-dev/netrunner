import { describe, it, expect } from 'vitest'
import { shouldUpsert } from '../src/auto/gate'

// rol: tests del gate de validación del curator (AC-1..4 de features/gate.feature).
// Un Memento malo no se propaga (riesgo #1 del Juez 2, robar de SkillOpt).

describe('gate de validación del curator', () => {
  it('señal clara → upsert (AC-1)', () => {
    expect(shouldUpsert({ ok: true, veces: 5 })).toBe(true)
  })

  it('fallo → no upsert (AC-2)', () => {
    expect(shouldUpsert({ ok: false, veces: 5 })).toBe(false)
  })

  it('señal insuficiente → no upsert (AC-3)', () => {
    expect(shouldUpsert({ ok: true, veces: 1 })).toBe(false)
  })

  it('umbral default 3 (AC-4)', () => {
    expect(shouldUpsert({ ok: true, veces: 3 })).toBe(true)
    expect(shouldUpsert({ ok: true, veces: 2 })).toBe(false)
  })
})
