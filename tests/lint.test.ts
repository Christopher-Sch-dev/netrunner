import { describe, it, expect } from 'vitest'
import { lintSnapshot } from '../src/auto/lint'

// rol: tests del lint periódico (AC-1..4 de features/lint.feature).
// Health-check del snapshot (idea de Karpathy — el lint del LLM Wiki).

describe('lint periódico del snapshot', () => {
  it('detecta stale (coverage 0 con tests presentes) (AC-1/2)', () => {
    const snapshot = {
      coverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
      dirs: ['src', 'tests'],
      todos: { todos: [] },
    } as never

    const result = lintSnapshot(snapshot)

    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues.some((i) => i.type === 'stale')).toBe(true)
  })

  it('snapshot sano → sin issues (AC-4)', () => {
    const snapshot = {
      coverage: { lines: 85, functions: 70, branches: 60, statements: 80 },
      dirs: ['src', 'tests'],
      todos: { todos: [] },
    } as never

    const result = lintSnapshot(snapshot)

    expect(result.issues).toEqual([])
  })
})
