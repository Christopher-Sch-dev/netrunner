import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { coverageInfo } from '../src/context/coverage'

// rol: tests del detector de cobertura (AC-1..4 de features/coverage.feature).

describe('detector de cobertura', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-coverage-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('coverage-summary.json existe: devuelve % (AC-1/2/4)', () => {
    mkdirSync(join(dir, 'coverage'), { recursive: true })
    writeFileSync(
      join(dir, 'coverage', 'coverage-summary.json'),
      JSON.stringify({
        total: {
          lines: { pct: 85 },
          functions: { pct: 70 },
          branches: { pct: 60 },
          statements: { pct: 80 },
        },
      }),
    )

    const info = coverageInfo(dir)

    expect(info.lines).toBe(85)
    expect(info.functions).toBe(70)
    expect(info.branches).toBe(60)
    expect(info.statements).toBe(80)
    // son números, no strings
    expect(typeof info.lines).toBe('number')
  })

  it('sin coverage → 0 en todo (AC-3, no falla)', () => {
    const info = coverageInfo(dir)
    expect(info).toEqual({ lines: 0, functions: 0, branches: 0, statements: 0 })
  })
})
