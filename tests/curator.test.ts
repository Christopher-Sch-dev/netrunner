import { describe, it, expect } from 'vitest'
import { curate, type Observation } from '../src/auto/curator'

// rol: tests del curator determinista (AC-1..5 de features/curator.feature).
// Función PURE (sin I/O), auto-mejora con señal EXTERNA, nunca auto-crítica.

describe('curator determinista', () => {
  it('observación exitosa genera un memento de skill (AC-1/3)', () => {
    const obs: Observation[] = [{ tipo: 'usage', symbol: 'login', ok: true, veces: 10 }]
    const actions = curate(obs)

    expect(actions.length).toBeGreaterThan(0)
    const a = actions[0]
    expect(a.type).toBe('upsert_skill')
    if (a.type === 'upsert_skill') expect(a.skill).toContain('login')
  })

  it('señal ausente → no-op (AC-5)', () => {
    const actions = curate([])
    expect(actions).toEqual([])
  })

  it('idempotente: misma entrada → misma salida (AC-4)', () => {
    const obs: Observation[] = [{ tipo: 'usage', symbol: 'auth', ok: true, veces: 3 }]
    expect(curate(obs)).toEqual(curate(obs))
  })

  it('skill stale (sin uso) → mark needs_review, NO borra (AC-2)', () => {
    const obs: Observation[] = [{ tipo: 'stale', symbol: 'old_fn', ok: false, veces: 0 }]
    const actions = curate(obs)
    // mark, nunca delete (el tipo no tiene 'delete' — fail-safe de diseño)
    expect(actions.some((a) => a.type === 'mark_review')).toBe(true)
  })
})
