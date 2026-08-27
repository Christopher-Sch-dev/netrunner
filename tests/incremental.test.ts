import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { indexProject } from '../src/context/graph'

// mock bun:sqlite → node:sqlite (same API) so vitest (node) can resolve graph.ts
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

// role: TDD RED→GREEN para Wave F1 — incremental edge-level update.
// El gap (DEC-011): indexProject(incremental) re-extrae el archivo cambiado pero NO
// limpia nodos/edges huérfanos (símbolos eliminados) ni evicta archivos borrados.

describe('incremental edge-level update (Wave F1)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-incr-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  const src = () => join(dir, 'src')

  function countNodes(db: DatabaseSync): number {
    return (db.prepare('SELECT COUNT(*) AS c FROM nodes').get() as { c: number }).c
  }
  function countEdges(db: DatabaseSync): number {
    return (db.prepare('SELECT COUNT(*) AS c FROM edges').get() as { c: number }).c
  }
  function nodeNames(db: DatabaseSync): string[] {
    return (db.prepare('SELECT name FROM nodes').all() as { name: string }[]).map((r) => r.name)
  }

  it('RED: re-extraer un archivo cambiado evicta nodos de símbolos eliminados (stale node pruning)', async () => {
    mkdirSync(src(), { recursive: true })
    const file = join(src(), 'a.ts')
    writeFileSync(file, 'export const A = 1\nexport const B = 2\n')
    await indexProject(dir, { incremental: true })

    // elimino el símbolo B del archivo y re-indexo incremental
    writeFileSync(file, 'export const A = 1\n')
    await indexProject(dir, { incremental: true })

    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    const names = nodeNames(db)
    db.close()
    expect(names).toContain('A')
    expect(names).not.toContain('B') // B fue eliminado → no debe quedar stale
  })

  it('RED: re-extraer un archivo cambiado evicta edges de llamadas eliminadas (stale edge pruning)', async () => {
    mkdirSync(src(), { recursive: true })
    const file = join(src(), 'x.ts')
    writeFileSync(file, 'function login(): void { authenticate() }\nfunction authenticate(): void {}\n')
    await indexProject(dir, { incremental: true })

    // quito la llamada a authenticate
    writeFileSync(file, 'function login(): void {}\nfunction authenticate(): void {}\n')
    await indexProject(dir, { incremental: true })

    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    const row = db
      .prepare(`SELECT * FROM edges WHERE kind = 'calls' AND "from" LIKE '%login%'`)
      .get() as { from: string } | undefined
    db.close()
    expect(row).toBeUndefined() // el edge calls login→authenticate ya no existe
  })

  it('RED: borrar un archivo evicta sus nodos y edges (deleted-file eviction)', async () => {
    mkdirSync(src(), { recursive: true })
    const a = join(src(), 'a.ts')
    const b = join(src(), 'b.ts')
    writeFileSync(a, 'export const A = 1\n')
    writeFileSync(b, 'export const B = 2\n')
    await indexProject(dir, { incremental: true })

    // borro b.ts del filesystem y re-indexo incremental
    unlinkSync(b)
    await indexProject(dir, { incremental: true })

    const db = new DatabaseSync(join(dir, '.netrunner', 'index.db'))
    const names = nodeNames(db)
    db.close()
    expect(names).toContain('A')
    expect(names).not.toContain('B') // b.ts borrado → sus nodos evictados
  })

  it('RED: incremental devuelve en `changed` SOLO los nodos/edges de archivos afectados', async () => {
    mkdirSync(src(), { recursive: true })
    const a = join(src(), 'a.ts')
    const b = join(src(), 'b.ts')
    writeFileSync(a, 'export const A = 1\n')
    writeFileSync(b, 'export const B = 2\n')
    await indexProject(dir, { incremental: true })

    // solo cambio a.ts
    writeFileSync(a, 'export const A = 1\nexport const A2 = 3\n')
    const result = await indexProject(dir, { incremental: true })

    const changedFiles = new Set(result.changed.nodes.map((n) => n.file))
    expect(changedFiles).toEqual(new Set(['src/a.ts'])) // solo a.ts, NO b.ts
    expect(result.changed.nodes.some((n) => n.name === 'A2')).toBe(true)
    expect(result.changed.nodes.some((n) => n.name === 'B')).toBe(false)
  })

  it('RED: sin cambios, incremental no re-extrae nada (changed vacío)', async () => {
    mkdirSync(src(), { recursive: true })
    writeFileSync(join(src(), 'a.ts'), 'export const A = 1\n')
    await indexProject(dir, { incremental: true })

    const result = await indexProject(dir, { incremental: true })
    expect(result.changed.nodes.length).toBe(0)
    expect(result.changed.edges.length).toBe(0)
  })
})
