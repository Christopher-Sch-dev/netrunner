import { describe, it, expect, beforeEach } from 'vitest'
import { shouldUpsert, shouldUpsertSkillOpt, addToRejectBuffer, isInRejectBuffer } from '../src/auto/gate'

// role: tests for the curator validation gate (AC-1..4 of features/gate.feature).
// A bad Memento does not propagate (risk #1).

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

// role: tests for the SkillOpt gate (features/gate-skillopt.feature, arXiv 2605.23904).
// A skill is accepted ONLY if it strictly improves a held-out score and is not
// in the reject buffer (no re-trying edits that didn't improve).

describe('gate SkillOpt (mejora estricta held-out)', () => {
  beforeEach(() => {
    // limpiar el buffer de rechazo entre tests (módulo-level Set)
    // (no hay API de reset; usamos skills únicos por test)
  })

  it('mejora estricta + señal → acepta (AC-1)', () => {
    expect(shouldUpsertSkillOpt({ ok: true, veces: 3, heldOutScore: 0.8, prevScore: 0.6 }, 'skill-a')).toBe(true)
  })

  it('no mejora (score <= prev) → rechaza (AC-2)', () => {
    expect(shouldUpsertSkillOpt({ ok: true, veces: 3, heldOutScore: 0.6, prevScore: 0.8 }, 'skill-b')).toBe(false)
  })

  it('en buffer de rechazo → rechaza aunque mejore (AC-3)', () => {
    addToRejectBuffer('skill-c')
    expect(shouldUpsertSkillOpt({ ok: true, veces: 3, heldOutScore: 0.9, prevScore: 0.5 }, 'skill-c')).toBe(false)
  })

  it('addToRejectBuffer / isInRejectBuffer (AC-4, AC-5)', () => {
    expect(isInRejectBuffer('skill-d')).toBe(false)
    addToRejectBuffer('skill-d')
    expect(isInRejectBuffer('skill-d')).toBe(true)
  })

  it('umbral default 3 (AC-6)', () => {
    expect(shouldUpsertSkillOpt({ ok: true, veces: 2, heldOutScore: 0.9, prevScore: 0.5 }, 'skill-e')).toBe(false)
  })
})
