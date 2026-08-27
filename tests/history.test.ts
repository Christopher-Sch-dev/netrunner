import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { logOperation, history } from '../src/history/index'

// role: tests for history (AC-H1/H2 of features/vision.feature).
// El agente recuerda qué operó (observar/decidir).

describe('history (memoria del agente)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-history-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('logOperation apende y history las devuelve (AC-H1/H2)', () => {
    logOperation(dir, 'init')
    logOperation(dir, 'explore login')

    const result = history(dir)
    expect(result.operations.length).toBe(2)
    expect(result.operations[0].command).toBe('explore login') // más reciente primero
    expect(result.operations[0].status).toBe('ok')
  })

  it('sin history → { operations: [] } (no falla)', () => {
    expect(history(dir)).toEqual({ operations: [] })
  })
})
