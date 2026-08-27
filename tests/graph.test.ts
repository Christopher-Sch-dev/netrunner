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

// rol: crea un proyecto temporal con un archivo TS, corre indexProject, verifica el index.db.

describe('graph (indexación del grafo)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-graph-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('indexa un proyecto TS: crea index.db con nodos y edges', async () => {
    const src = join(dir, 'src')
    mkdirSync(src, { recursive: true })
    writeFileSync(
      join(src, 'main.ts'),
      `import { foo } from './dep'\nfunction login(): void { authenticate(foo()) }\nfunction authenticate(): void {}\n`,
    )

    const result = await indexProject(dir)

    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    const nodeCount = db.prepare('SELECT COUNT(*) AS c FROM nodes').get() as { c: number }
    const edgeCount = db.prepare('SELECT COUNT(*) AS c FROM edges').get() as { c: number }
    db.close()

    expect(result.nodes.length).toBeGreaterThan(0)
    expect(nodeCount.c).toBeGreaterThan(0)
    expect(edgeCount.c).toBeGreaterThan(0)
  })

  it('incremental=true con archivo sin cambios NO duplica nodos', async () => {
    const src = join(dir, 'src')
    mkdirSync(src, { recursive: true })
    writeFileSync(join(src, 'a.ts'), 'export const A = 1\n')

    await indexProject(dir, { incremental: true })
    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    const first = db.prepare('SELECT COUNT(*) AS c FROM nodes').get() as { c: number }
    await indexProject(dir, { incremental: true })
    const second = db.prepare('SELECT COUNT(*) AS c FROM nodes').get() as { c: number }
    db.close()

    expect(second.c).toBe(first.c)
  })

  it('edge calls EXTRACTED se persiste', async () => {
    const src = join(dir, 'src')
    mkdirSync(src, { recursive: true })
    writeFileSync(
      join(src, 'x.ts'),
      `function login(): void { authenticate() }\nfunction authenticate(): void {}\n`,
    )

    await indexProject(dir)

    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    const row = db
      .prepare(`SELECT * FROM edges WHERE kind = 'calls' AND "from" LIKE '%login%'`)
      .get() as { from: string; to: string; provenance: string } | undefined
    db.close()

    expect(row).toBeDefined()
    expect(row!.provenance).toBe('EXTRACTED')
  })
})
