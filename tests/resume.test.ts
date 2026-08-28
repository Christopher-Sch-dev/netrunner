import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resume } from '../src/resume/index'

// mock bun:sqlite → node:sqlite (para que snapshot → detect/graph resuelva)
vi.mock('bun:sqlite', () => {
  const { DatabaseSync } = require('node:sqlite')
  return {
    Database: class extends DatabaseSync {
      constructor(path: string) { super(path) }
      query(sql: string) {
        const db = this
        return {
          get: (...args: unknown[]) => (db.prepare(sql) as { get: (...a: unknown[]) => unknown }).get(...args),
          all: (...args: unknown[]) => (db.prepare(sql) as { all: (...a: unknown[]) => unknown }).all(...args),
          run: (...args: unknown[]) => (db.prepare(sql) as { run: (...a: unknown[]) => unknown }).run(...args),
        }
      }
    },
  }
})

// role: tests for resume (AC-1..5 of features/resume.feature).
// El recuerdo que se re-adhiere al reconectar (virus persiste tras Jack-Out).

describe('resume (el recuerdo que se re-adhiere)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-resume-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('sin estado → devuelve vacíos (AC-5)', async () => {
    const result = await resume(dir)
    // fix auditor implante (gap 1): resume SIEMPRE da snapshot (construido on-the-fly)
    expect(result.snapshot).not.toBeNull()
    expect(result.decisions).toEqual([])
    expect(result.history.operations).toEqual([])
    expect(typeof result.canonStale).toBe('boolean')
  })

  it('carga decisiones open + history + canonStale (AC-1..4)', async () => {
    // crea una decisión open
    mkdirSync(join(dir, '.netrunner', 'decisions'), { recursive: true })
    writeFileSync(join(dir, '.netrunner', 'decisions', 'mi-decision.md'), '---\nstatus: open\n---\n# Mi decisión\n')
    // crea history
    mkdirSync(join(dir, '.netrunner'), { recursive: true })
    writeFileSync(join(dir, '.netrunner', 'history.log'), `${Date.now()}\tinit\tok\n`)

    const result = await resume(dir)

    expect(result.decisions.length).toBeGreaterThan(0)
    expect(result.history.operations.length).toBeGreaterThan(0)
    expect(typeof result.canonStale).toBe('boolean')
  })
})
