import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { exportMap } from '../src/map/index'

// mock bun:sqlite → node:sqlite (para que graph.ts resuelva)
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

// rol: tests de map (AC-1..4 de features/map.feature). Grafo visual (la matrix).

describe('map (grafo visual)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-map-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('exporta el grafo a JSON (AC-1/2)', () => {
    mkdirSync(join(dir, '.netrunner'), { recursive: true })
    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    db.exec('CREATE TABLE nodes (id TEXT PRIMARY KEY, name TEXT, kind TEXT, file TEXT, line INTEGER, endLine INTEGER)')
    db.exec('CREATE TABLE edges ("from" TEXT, "to" TEXT, kind TEXT, provenance TEXT)')
    db.prepare('INSERT INTO nodes VALUES (?,?,?,?,?,?)').run('def:src/a.ts:login', 'login', 'function', 'src/a.ts', 1, 1)
    db.prepare('INSERT INTO edges VALUES (?,?,?,?)').run('def:src/a.ts:login', 'def:src/b.ts:auth', 'calls', 'EXTRACTED')
    db.close()

    const map = exportMap(dir)

    expect(map.nodes.length).toBeGreaterThan(0)
    expect(map.nodes[0].name).toBe('login')
    expect(map.edges.length).toBeGreaterThan(0)
    expect(map.edges[0].kind).toBe('calls')
  })

  it('sin index.db → { nodes: [], edges: [] } (AC-3, no falla)', () => {
    const map = exportMap(dir)
    expect(map).toEqual({ nodes: [], edges: [] })
  })
})
