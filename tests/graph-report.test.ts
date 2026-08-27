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

import { graphReport } from '../src/graph-report/index'
import { indexProject } from '../src/context/graph'

// role: tests for graph-report (AC-1..4 of features/graph-report.feature).
// Dashboard humano del grafo (gap Graphify: GRAPH_REPORT.md).

describe('graph-report (dashboard humano)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-report-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export function a() { return 1 }\n')
    writeFileSync(join(dir, 'src', 'b.ts'), "import { a } from './a'\nexport function b() { return a() }\n")
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('genera markdown con god nodes + resumen (AC-1/2)', async () => {
    await indexProject(dir) // indexar primero (graphReport lee del index.db)
    const report = await graphReport(dir)
    expect(report).toContain('God Nodes')
    expect(report).toContain('Nodes')
  })

  it('sin grafo → reporte vacío (AC-3)', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'netrunner-report-empty-'))
    expect(await graphReport(empty)).toBe('')
    rmSync(empty, { recursive: true, force: true })
  })
})
