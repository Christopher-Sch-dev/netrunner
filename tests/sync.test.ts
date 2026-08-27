import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { needsSync, syncIfNeeded } from '../src/context/sync'

// mock bun:sqlite → node:sqlite (so graph.ts can resolve)
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

// role: tests for auto-sync (AC-1..4 of features/sync.feature). The graph stays up to date on its own.

describe('auto-sync del grafo', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-sync-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 1\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('sin index.db → needsSync true (AC-3)', () => {
    expect(needsSync(dir)).toBe(true)
  })

  it('archivo cambió → needsSync true (AC-1)', async () => {
    // index first
    const { indexProject } = await import('../src/context/graph')
    await indexProject(dir)
    expect(needsSync(dir)).toBe(false)

    // modifica un archivo fuente con mtime futuro (evita race de ms)
    const { utimesSync } = await import('node:fs')
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 2\n')
    const future = Date.now() + 5000
    utimesSync(join(dir, 'src', 'a.ts'), future / 1000, future / 1000)
    expect(needsSync(dir)).toBe(true)
  })

  it('syncIfNeeded re-indexa solo si cambió (AC-2, idempotente)', async () => {
    const { indexProject } = await import('../src/context/graph')
    await indexProject(dir)
    const before = needsSync(dir)
    const result = await syncIfNeeded(dir)
    expect(result.synced).toBe(false) // no cambió → no re-indexa
    expect(before).toBe(false)
  })
})
