import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { depthQuery } from '../src/depth/index'

// mock bun:sqlite → node:sqlite (so queries.ts can resolve)
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

// role: tests for depth (AC-1..4 of features/depth.feature). Disclosure by levels (floors).

describe('depth (disclosure por niveles)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-depth-'))
    mkdirSync(join(dir, '.netrunner'), { recursive: true })
    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    db.exec('CREATE TABLE nodes (id TEXT PRIMARY KEY, name TEXT, kind TEXT, file TEXT, line INTEGER, endLine INTEGER)')
    db.exec('CREATE TABLE edges ("from" TEXT, "to" TEXT, kind TEXT, provenance TEXT)')
    db.prepare('INSERT INTO nodes VALUES (?,?,?,?,?,?)').run('def:src/a.ts:login', 'login', 'function', 'src/a.ts', 1, 1)
    db.prepare('INSERT INTO nodes VALUES (?,?,?,?,?,?)').run('def:src/b.ts:auth', 'auth', 'function', 'src/b.ts', 1, 1)
    db.prepare('INSERT INTO edges VALUES (?,?,?,?)').run('def:src/b.ts:auth', 'def:src/a.ts:login', 'calls', 'EXTRACTED')
    db.close()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('L0 devuelve solo lo básico (AC-1/2)', async () => {
    const r = await depthQuery('login', 0, dir)
    expect(r.found).toBe(true)
    expect(r.name).toBe('login')
    expect(r.kind).toBe('function')
    expect(r.file).toBe('src/a.ts')
    expect(r.callers).toBeUndefined()
  })

  it('L2 agrega callers (AC-2)', async () => {
    const r = await depthQuery('login', 2, dir)
    expect(r.found).toBe(true)
    expect(r.callers).toBeDefined()
    expect(r.callers!.length).toBeGreaterThan(0)
  })

  it('símbolo no encontrado → { found: false } (AC-3)', async () => {
    const r = await depthQuery('nope', 0, dir)
    expect(r.found).toBe(false)
  })
})
