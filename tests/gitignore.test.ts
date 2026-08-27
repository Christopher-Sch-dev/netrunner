import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadGitignore, isIgnored } from '../src/context/gitignore'

// role: tests for gitignore (AC-1..4 of features/gitignore.feature).
// El grafo respeta el .gitignore del proyecto (no abstrae lo ignorado).

describe('gitignore (respetar el .gitignore del proyecto)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-gitignore-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('carga los patrones del .gitignore (AC-1)', () => {
    writeFileSync(join(dir, '.gitignore'), 'node_modules/\nvendor/\ngenerated/\n')
    const patterns = loadGitignore(dir)
    expect(patterns).toContain('vendor/')
    expect(patterns).toContain('generated/')
  })

  it('isIgnored matchea un patrón (AC-2)', () => {
    expect(isIgnored('vendor/lib.ts', ['vendor/'])).toBe(true)
    expect(isIgnored('src/app.ts', ['vendor/'])).toBe(false)
  })

  it('isIgnored soporta globs * (fix auditor BUG1)', () => {
    expect(isIgnored('src/debug.log.ts', ['src/*.log.ts'])).toBe(true)
    expect(isIgnored('src/app.ts', ['src/*.log.ts'])).toBe(false)
  })

  it('sin .gitignore → lista vacía (AC-4)', () => {
    expect(loadGitignore(dir)).toEqual([])
  })
})
