import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { meshProjects } from '../src/mesh/index'

// mock bun:sqlite → node:sqlite (para que graph.ts resuelva)
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

// rol: tests de net mesh (AC-1..4 de features/mesh.feature).
// De "jack a un sistema" a "jack a la red" (Jueces 1,3).

describe('net mesh (grafo multi-repo)', () => {
  let dir1: string
  let dir2: string

  beforeEach(() => {
    dir1 = mkdtempSync(join(tmpdir(), 'netrunner-mesh1-'))
    dir2 = mkdtempSync(join(tmpdir(), 'netrunner-mesh2-'))
    mkdirSync(join(dir1, 'src'), { recursive: true })
    mkdirSync(join(dir2, 'src'), { recursive: true })
    writeFileSync(join(dir1, 'src', 'a.ts'), 'export const x = 1\n')
    writeFileSync(join(dir2, 'src', 'b.ts'), 'export const y = 2\n')
  })

  afterEach(() => {
    rmSync(dir1, { recursive: true, force: true })
    rmSync(dir2, { recursive: true, force: true })
  })

  it('conecta N proyectos (AC-1)', async () => {
    const mesh = await meshProjects([dir1, dir2])

    expect(mesh.projects.length).toBe(2)
    expect(mesh.totalNodes).toBeGreaterThan(0)
  })

  it('sin dirs → vacío (AC-3)', async () => {
    const mesh = await meshProjects([])
    expect(mesh.projects).toEqual([])
    expect(mesh.totalNodes).toBe(0)
  })
})
