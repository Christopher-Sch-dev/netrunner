import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { evaluatePolicy, resolveSecrets, type PolicyContext } from '../src/policy/index'

// rol: tests de policy por intención + secrets scopeados (AC-1..4 de features/policy-intent.feature).

describe('policy por intención + secrets', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-policy-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('read → allow; mutate sin approval → deny (AC-1/2)', () => {
    expect(evaluatePolicy('explore', { readOnly: true, approval: false })).toBe('allow')
    expect(evaluatePolicy('edit', { readOnly: false, approval: false })).toBe('deny')
    expect(evaluatePolicy('destroy', { readOnly: false, approval: false })).toBe('deny')
  })

  it('sin contexto → deny (fail-closed, AC-4)', () => {
    expect(evaluatePolicy('edit', {} as PolicyContext)).toBe('deny')
  })

  it('secrets scopeados por tool (AC-3)', () => {
    mkdirSync(join(dir, '.netrunner'), { recursive: true })
    writeFileSync(
      join(dir, '.netrunner', 'secrets.json'),
      JSON.stringify({ toolA: { KEY: 'secret-a' }, toolB: { KEY: 'secret-b' } }),
    )

    const a = resolveSecrets(dir, 'toolA')
    expect(a).toEqual({ KEY: 'secret-a' })
    // toolB no filtra secret de toolA
    const b = resolveSecrets(dir, 'toolB')
    expect(b).toEqual({ KEY: 'secret-b' })
  })
})
