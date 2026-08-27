import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { exportMap } from '../src/map/index'

// mock bun:sqlite → node:sqlite (para que map.ts resuelva)
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

// rol: tests de provenance en map (AC-1..4 de features/provenance.feature).

describe('map con provenance', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-provenance-'))
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

  it('cada edge expone provenance + file de origen (AC-1)', () => {
    const map = exportMap(dir)
    expect(map.edges.length).toBeGreaterThan(0)
    const edge = map.edges[0]
    expect(edge.provenance).toBe('EXTRACTED')
    expect(edge.file).toBe('src/b.ts') // file del nodo from
  })

  it('sin provenance → default INFERRED (AC-3, no rompe)', () => {
    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    db.prepare('INSERT INTO edges VALUES (?,?,?,?)').run('def:src/a.ts:login', 'def:src/b.ts:auth', 'calls', '')
    db.close()
    const map = exportMap(dir)
    const inferred = map.edges.find((e) => e.provenance === 'INFERRED')
    expect(inferred).toBeDefined()
  })
})
