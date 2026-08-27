import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { breach } from '../src/breach/index'

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

// role: tests for breach (AC-1..5 of features/breach.feature).
// Descifrar un repo desconocido en secuencia determinista (Breach Protocol).

describe('breach (descifrar repo)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-breach-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('devuelve stack + git + services + resumen (AC-1..5)', async () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'probe', dependencies: { react: '^18' } }))
    const r = await breach(dir)
    expect(r.stack).toBeTruthy()
    expect(r.git).toBeDefined()
    expect(r.services).toBeDefined()
    expect(r.summary).toBeTruthy()
  })

  it('sin git → git null (no falla, AC-5)', async () => {
    const r = await breach(dir)
    expect(r.git).toBeDefined() // gitInfo devuelve branch null, no lanza
  })
})
