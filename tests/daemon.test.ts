import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { daemonTick } from '../src/daemon/index'

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

// rol: tests del daemon persistente (AC-1..4 de features/daemon.feature).
// El grafo se mantiene al día sin invocar init manual (curator fantasma).

describe('daemon persistente', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-daemon-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 1\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('sin cambios → no-op (AC-3/4)', async () => {
    const { indexProject } = await import('../src/context/graph')
    await indexProject(dir)

    const r1 = await daemonTick(dir)
    const r2 = await daemonTick(dir)

    expect(r1.synced).toBe(false)
    expect(r2.synced).toBe(false)
    expect(r1.issues).toEqual([])
    expect(r1.actions).toEqual([])
  })

  it('con cambios → sync (AC-1/2)', async () => {
    const { indexProject } = await import('../src/context/graph')
    await indexProject(dir)

    // modifica un archivo con mtime futuro
    const { utimesSync } = await import('node:fs')
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 2\n')
    const future = Date.now() + 5000
    utimesSync(join(dir, 'src', 'a.ts'), future / 1000, future / 1000)

    const r = await daemonTick(dir)
    expect(r.synced).toBe(true)
  })
})
