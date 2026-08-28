import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setup, detectAgents, AGENT_PRIORITY } from '../src/setup/index'

vi.mock('bun:sqlite', () => {
  const { DatabaseSync } = require('node:sqlite')
  return {
    Database: class extends DatabaseSync {
      constructor(path: string) { super(path) }
      query(sql: string) {
        const db = this
        return {
          get: (...a: unknown[]) => (db.prepare(sql) as { get: (...x: unknown[]) => unknown }).get(...a),
          all: (...a: unknown[]) => (db.prepare(sql) as { all: (...x: unknown[]) => unknown }).all(...a),
          run: (...a: unknown[]) => (db.prepare(sql) as { run: (...x: unknown[]) => unknown }).run(...a),
        }
      }
    },
  }
})

// role: tests for setup (features/setup.feature) — instalador agéntico un-comando.
describe('setup (instalador agéntico un-comando)', () => {
  let dir: string
  const origHome = process.env.HOME

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-setup-'))
    // HOME falso aislado para detectAgents (no tocar el real)
    process.env.HOME = dir
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    process.env.HOME = origHome
  })

  it('ordena agentes por prioridad opencode→hermes→claude→codex (AC-2)', () => {
    expect(AGENT_PRIORITY).toEqual(['opencode', 'hermes', 'claude', 'codex'])
  })

  it('detecta solo agentes presentes (AC-1)', () => {
    mkdirSync(join(dir, '.opencode'), { recursive: true })
    mkdirSync(join(dir, '.claude'), { recursive: true })
    const detected = detectAgents()
    expect(detected).toContain('opencode')
    expect(detected).toContain('claude')
    expect(detected).not.toContain('hermes') // no está presente
    // prioridad: opencode antes que claude
    expect(detected.indexOf('opencode')).toBeLessThan(detected.indexOf('claude'))
  })

  it('setup ejecuta el pipeline y es idempotente (AC-4/5)', async () => {
    mkdirSync(join(dir, '.opencode'), { recursive: true })
    // genera archivos de proyecto
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export function a() { return 1 }\n')
    const r1 = await setup(dir)
    expect(r1.ok).toBe(true)
    expect(r1.detected).toContain('opencode')
    expect(r1.configured).toContain('opencode')
    expect(r1.stateFile).toContain('.netrunner/state.json')
    // idempotente: re-correr no falla
    const r2 = await setup(dir)
    expect(r2.ok).toBe(true)
  })
})
