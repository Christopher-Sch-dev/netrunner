import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { harvest } from '../src/daemon/harvest'

// role: tests for daemon-senal harvest (AC-1..5 of features/daemon-senal.feature).
// El curator deja de ser un esqueleto: recibe observaciones reales de history+events.

describe('daemon-senal (harvest de observaciones)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-harvest-'))
    mkdirSync(join(dir, '.netrunner'), { recursive: true })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('ops exitosas → observación usage ok=true (AC-1/2)', () => {
    writeFileSync(join(dir, '.netrunner', 'events.log'),
      JSON.stringify({ type: 'op/result', tool: 'op.test', ok: true, ts: Date.now() }) + '\n')
    const obs = harvest(dir)
    expect(obs.some((o) => o.tipo === 'usage' && o.ok === true)).toBe(true)
  })

  it('ops fallidas → observación usage ok=false (AC-3)', () => {
    writeFileSync(join(dir, '.netrunner', 'events.log'),
      JSON.stringify({ type: 'op/error', tool: 'op.test', ok: false, ts: Date.now() }) + '\n')
    const obs = harvest(dir)
    expect(obs.some((o) => o.tipo === 'usage' && o.ok === false)).toBe(true)
  })

  it('sin events → observaciones vacías (AC-5)', () => {
    expect(harvest(dir)).toEqual([])
  })
})
