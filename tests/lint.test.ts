import { describe, it, expect } from 'vitest'
import { lintSnapshot } from '../src/auto/lint'

// role: tests for the periodic lint (AC-1..4 of features/lint.feature).
// Health-check of the snapshot.

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
