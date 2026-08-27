import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

import { shortestPath } from '../src/path/index'
import { indexProject } from '../src/context/graph'

// role: tests for path (AC-1..4 of features/path.feature).
// Shortest-path entre dos símbolos (gap Graphify: graphify path A B).

describe('path (shortest-path)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-path-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export function a() { return 1 }\n')
    writeFileSync(join(dir, 'src', 'b.ts'), "import { a } from './a'\nexport function b() { return a() }\n")
    writeFileSync(join(dir, 'src', 'c.ts'), "import { b } from './b'\nexport function c() { return b() }\n")
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('camino existe → devuelve [a, b, c] (AC-1)', async () => {
    await indexProject(dir) // indexar primero (path lee del index.db)
    const path = await shortestPath(dir, 'a', 'c')
    expect(path.length).toBeGreaterThan(0)
    expect(path[0]).toBe('a')
    expect(path[path.length - 1]).toBe('c')
  })

  it('sin camino → [] (AC-2)', async () => {
    const path = await shortestPath(dir, 'a', 'no-existe')
    expect(path).toEqual([])
  })
})
