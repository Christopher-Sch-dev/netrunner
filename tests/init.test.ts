import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { initProject } from '../src/init'

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

// role: tests for init vision (AC-1.1/1.2 of features/vision.feature).
// init connects, not just indexes.

describe('init vision (conecta, no solo indexa)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-init-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 1\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('init genera el conectable layer (mcp.json + SKILL.md + AGENTS.md) (AC-1.1)', async () => {
    const result = await initProject(dir)

    // indexa
    expect(result.counts.nodes).toBeGreaterThan(0)
    // genera artefactos agent-operables
    expect(existsSync(join(dir, '.mcp.json'))).toBe(true)
    expect(existsSync(join(dir, '.netrunner', 'skills', 'netrunner', 'SKILL.md'))).toBe(true)
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(true)
  })

  it('init es idempotente (AC-1.2)', async () => {
    await initProject(dir)
    const first = readFileSync(join(dir, '.mcp.json'), 'utf8')

    await initProject(dir)
    const second = readFileSync(join(dir, '.mcp.json'), 'utf8')

    expect(second).toBe(first) // no duplica ni cambia
  })
})
