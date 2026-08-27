import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { daemonWatch } from '../src/daemon/watch'

// mock bun:sqlite → node:sqlite (para que daemonTick → snapshot → detect/graph resuelva)
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

// role: tests for daemon-watch (AC-1..4 of features/daemon-watch.feature).
// El daemon residente corre en bucle con intervalos.

describe('daemon-watch (residente)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-watch-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('corre maxTicks pasadas (AC-1/2)', async () => {
    const results = await daemonWatch(dir, { intervalMs: 1, maxTicks: 2 })
    expect(results.length).toBe(2)
  })

  it('cada resultado tiene synced/issues/actions (AC-3/4)', async () => {
    const results = await daemonWatch(dir, { intervalMs: 1, maxTicks: 1 })
    expect(results[0]).toHaveProperty('synced')
    expect(results[0]).toHaveProperty('issues')
    expect(results[0]).toHaveProperty('actions')
  })
})
