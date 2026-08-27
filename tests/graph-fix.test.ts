import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { indexProject } from '../src/context/graph'

// mock bun:sqlite → node:sqlite (mismo API) para que vitest (node) resuelva graph.ts
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

// rol: tests del fix Bug A (features/graph-fix.feature): colisión de IDs + .stryker-tmp.

describe('graph fix Bug A (colisión de IDs)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-graphfix-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('dos archivos con la misma función login generan DOS nodos distintos (AC-1/3)', async () => {
    const src = join(dir, 'src')
    mkdirSync(src, { recursive: true })
    writeFileSync(join(src, 'a.ts'), 'function login(): void {}\n')
    writeFileSync(join(src, 'b.ts'), 'function login(): void {}\n')

    await indexProject(dir)

    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    const rows = db.prepare(`SELECT id, file FROM nodes WHERE name = 'login'`).all() as { id: string; file: string }[]
    db.close()

    // dos nodos distintos, cada uno con su archivo en el id
    expect(rows.length).toBe(2)
    const ids = rows.map((r) => r.id)
    expect(ids).toContain('def:src/a.ts:login')
    expect(ids).toContain('def:src/b.ts:login')
  })

  it('.stryker-tmp NO se indexa (AC-2)', async () => {
    const src = join(dir, 'src')
    mkdirSync(src, { recursive: true })
    mkdirSync(join(dir, '.stryker-tmp', 'sandbox-x', 'src'), { recursive: true })
    writeFileSync(join(src, 'real.ts'), 'function realFn(): void {}\n')
    writeFileSync(join(dir, '.stryker-tmp', 'sandbox-x', 'src', 'real.ts'), 'function realFn(): void {}\n')

    await indexProject(dir)

    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    const rows = db.prepare(`SELECT file FROM nodes`).all() as { file: string }[]
    db.close()

    // ningún nodo proviene de .stryker-tmp
    expect(rows.every((r) => !r.file.includes('.stryker-tmp'))).toBe(true)
    // el real sí está
    expect(rows.some((r) => r.file.includes('src/real.ts'))).toBe(true)
  })
})
