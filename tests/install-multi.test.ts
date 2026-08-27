import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { install } from '../src/install'

// role: tests for install multi-plataforma (AC-1..4 of features/install-multi.feature).
// Ampliar install a más plataformas (gap Graphify: registrar skill en 20+ plataformas).

describe('install multi-plataforma ampliado', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-install-multi-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('instala en copilot (AC-1/2)', () => {
    const r = install('copilot', dir, '/usr/bin/netrunner')
    expect(r.written.length).toBeGreaterThan(0)
    expect(existsSync(join(dir, '.github/copilot/mcp.json'))).toBe(true)
  })

  it('instala en aider (AC-1/2)', () => {
    const r = install('aider', dir, '/usr/bin/netrunner')
    expect(r.written.length).toBeGreaterThan(0)
  })

  it('target inválido → error estructurado (AC-4)', () => {
    expect(() => install('no-existe', dir)).toThrow(/no soportado/)
  })
})
