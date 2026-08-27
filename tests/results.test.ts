import { describe, it, expect } from 'vitest'
import { appendResult, readResults } from '../src/auto/results'

// rol: tests del log de resultados del curator (AC-1..4 de features/results.feature).
// Auto-mejora anclada a señal externa medible (validador #5, patrón Karpathy log.md).

describe('log de resultados del curator', () => {
  it('append + read roundtrip (AC-1/2)', () => {
    const log: string[] = []
    appendResult(log, { symbol: 'login', action: 'upsert_skill', ok: true })

    const results = readResults(log)
    expect(results.length).toBe(1)
    expect(results[0].symbol).toBe('login')
    expect(results[0].action).toBe('upsert_skill')
    expect(results[0].ok).toBe(true)
  })

  it('log vacío → [] (AC-3)', () => {
    expect(readResults([])).toEqual([])
  })

  it('formato TSV parseable (AC-4)', () => {
    const log: string[] = []
    appendResult(log, { symbol: 'login', action: 'upsert_skill', ok: true })
    // la línea es TSV: timestamp | symbol | action | ok
    expect(log[0].split('\t').length).toBe(4)
    expect(log[0]).toMatch(/login\tupsert_skill\ttrue$/)
  })
})
