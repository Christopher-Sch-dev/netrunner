import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { canonStale } from '../src/canon/stale'

// role: tests for canonStale (AC-1..4 of features/canon-stale.feature).
// canon-vivo señal: detecta si el canon está desactualizado (el agente edita, no el sistema).

describe('canonStale (canon-vivo señal)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-canon-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('sin README.generated.md → stale (AC-2)', () => {
    expect(canonStale(dir)).toBe(true)
  })

  it('canon más nuevo que el proyecto → false (AC-1)', () => {
    // crea canon con mtime futuro
    const canonPath = join(dir, 'README.generated.md')
    writeFileSync(canonPath, '# canon')
    // force mtime future
    const future = Date.now() + 100000
    utimesSync(canonPath, new Date(future), new Date(future))
    // archivo fuente con mtime pasado
    const srcPath = join(dir, 'src', 'a.ts')
    writeFileSync(srcPath, 'export const a = 1\n')
    utimesSync(srcPath, new Date(Date.now() - 100000), new Date(Date.now() - 100000))
    expect(canonStale(dir)).toBe(false)
  })

  it('proyecto cambió después del canon → true (AC-3)', () => {
    const canonPath = join(dir, 'README.generated.md')
    writeFileSync(canonPath, '# canon')
    // archivo fuente con mtime futuro (proyecto cambió)
    const srcPath = join(dir, 'src', 'a.ts')
    writeFileSync(srcPath, 'export const a = 1\n')
    const future = Date.now() + 100000
    utimesSync(srcPath, new Date(future), new Date(future))
    expect(canonStale(dir)).toBe(true)
  })
})
