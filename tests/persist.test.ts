import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { persistDecision } from '../src/persist/index'

// rol: tests de persist (AC-1..4 de features/persist.feature).
// Decisiones durables con provenance (el "virus que persiste tras Jack-Out").

describe('persist (decisiones durables)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-persist-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('persiste una decisión con provenance (AC-1/2)', () => {
    const result = persistDecision(dir, 'usar plugin system', 'netrunner')

    const path = join(dir, '.netrunner', 'decisions', 'usar-plugin-system.md')
    expect(existsSync(path)).toBe(true)
    const content = readFileSync(path, 'utf8')
    expect(content).toContain('usar plugin system')
    expect(content).toContain('netrunner') // autor
    expect(content).toContain('open') // estado
    expect(result.slug).toBe('usar-plugin-system')
  })

  it('idempotente: misma decisión → mismo slug (AC-4)', () => {
    const a = persistDecision(dir, 'usar plugin system', 'netrunner')
    const b = persistDecision(dir, 'usar plugin system', 'netrunner')
    expect(a.slug).toBe(b.slug)
  })
})
