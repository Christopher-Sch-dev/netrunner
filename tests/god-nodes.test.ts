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

import { godNodes } from '../src/god-nodes/index'
import { indexProject } from '../src/context/graph'

// role: tests for god nodes (AC-1..4 of features/god-nodes.feature).
// Nodos más conectados del grafo (gap Graphify: god nodes / comunidades).

describe('god nodes (nodos más conectados)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-god-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export function a() { return 1 }\n')
    writeFileSync(join(dir, 'src', 'b.ts'), "import { a } from './a'\nexport function b() { return a() }\n")
    writeFileSync(join(dir, 'src', 'c.ts'), "import { a } from './a'\nexport function c() { return a() }\n")
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('devuelve los más conectados primero (AC-1/2)', async () => {
    await indexProject(dir) // indexar primero (godNodes lee del index.db)
    const nodes = await godNodes(dir)
    expect(nodes.length).toBeGreaterThan(0)
    // el nodo 'a' es el más conectado (b y c lo importan)
    expect(nodes[0].name).toBe('a')
    expect(nodes[0].degree).toBeGreaterThan(0)
  })

  it('sin grafo → [] (AC-3)', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'netrunner-god-empty-'))
    expect(await godNodes(empty)).toEqual([])
    rmSync(empty, { recursive: true, force: true })
  })
})
