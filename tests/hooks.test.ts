import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { emitSignal, pendingSignals, markSignalsRead } from '../src/hooks/index'

// role: tests for hooks (AC-1..4 of features/hooks.feature).
// Señal al agente conectado (gap Cris: mandar info al que está conectado).

describe('hooks (señal al agente conectado)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-hooks-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('emite señal y la lee como pendiente (AC-1/2)', () => {
    emitSignal(dir, 'canon-pendiente', 'el canon requiere actualización')
    const pending = pendingSignals(dir)
    expect(pending.length).toBe(1)
    expect(pending[0].type).toBe('canon-pendiente')
  })

  it('marca leídas → pendientes vacío (AC-3)', () => {
    emitSignal(dir, 'cambio', 'hubo un cambio')
    markSignalsRead(dir)
    expect(pendingSignals(dir)).toEqual([])
  })

  it('sin señales → [] (AC-4)', () => {
    expect(pendingSignals(dir)).toEqual([])
  })
})
