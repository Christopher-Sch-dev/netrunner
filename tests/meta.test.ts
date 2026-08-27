import { describe, it, expect, vi } from 'vitest'
import { emit } from '../src/cli'

// mock bun:sqlite → node:sqlite (so cli.ts can resolve graph.ts)
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

// role: tests for _meta + schema version (AC-1..4 of features/meta.feature).
// The LLM knows what structure to expect and where the output comes from.

describe('_meta + schema version', () => {
  it('output incluye _meta con schemaVersion y tool (AC-1/2)', () => {
    const logged: string[] = []
    const spy = vi.spyOn(console, 'log').mockImplementation((s: unknown) => { logged.push(String(s)) })
    try {
      emit({ ok: true }, false, 'status')
    } finally {
      spy.mockRestore()
    }
    const parsed = JSON.parse(logged[0])
    expect(parsed._meta).toBeDefined()
    expect(parsed._meta.schemaVersion).toBe('1.0')
    expect(parsed._meta.tool).toBe('status')
    expect(parsed.ok).toBe(true) // does not break the output
  })

  it('--human no agrega _meta (AC-4)', () => {
    const logged: string[] = []
    const spy = vi.spyOn(console, 'log').mockImplementation((s: unknown) => { logged.push(String(s)) })
    try {
      emit({ ok: true }, true, 'status')
    } finally {
      spy.mockRestore()
    }
    const parsed = JSON.parse(logged[0])
    expect(parsed._meta).toBeUndefined()
  })
})
