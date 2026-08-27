import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { guardCheck } from '../src/guard/index'

// role: tests for guard (AC-1..4 of features/guard.feature). Black ICE: repo protections.

describe('guard (Black ICE: protecciones)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-guard-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('detecta un secret en un archivo (AC-1/2)', () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'config.ts'), 'const token = "ghp_abcdef123456"\n')

    const result = guardCheck(dir)

    expect(result.ok).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].reason).toMatch(/secret/i)
  })

  it('detecta archivos protegidos (.env) (AC-3)', () => {
    writeFileSync(join(dir, '.env'), 'API_KEY=secret\n')

    const result = guardCheck(dir)

    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.file.includes('.env'))).toBe(true)
  })

  it('sin issues → { ok: true, issues: [] } (AC-4)', () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 1\n')

    const result = guardCheck(dir)

    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })
})
