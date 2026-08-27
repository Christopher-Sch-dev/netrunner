import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { watchdogCheck } from '../src/watchdog/index'
import { pendingSignals } from '../src/hooks/index'

// role: tests for watchdog (AC-1..4 of features/watchdog.feature).
// Vigilar cambios y notificar (memoria viva, gap Cris).

describe('watchdog (vigilar cambios)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-watchdog-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('sin cambios → no emite señal (AC-3)', () => {
    watchdogCheck(dir)
    expect(pendingSignals(dir)).toEqual([])
  })

  it('con cambios → emite señal cambio (AC-1/2)', () => {
    // primer check establece el baseline (no emite)
    watchdogCheck(dir)
    // modifica un archivo (mtime futuro)
    const f = join(dir, 'src', 'a.ts')
    const future = new Date(Date.now() + 60000)
    utimesSync(f, future, future)
    // segundo check detecta el cambio → emite señal
    watchdogCheck(dir)
    const signals = pendingSignals(dir)
    expect(signals.some((s) => s.type === 'cambio')).toBe(true)
  })
})
