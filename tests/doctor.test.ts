/**
 * rol: tests DIRECTOS de src/doctor/index.ts — P6 gap fix.
 * doctor() combina buildSnapshot + lintSnapshot + guardCheck + canonStale en un self-check.
 * AC (spec en src/doctor/index.ts): AC-1 doctor(dir) → {healthy, lint, guard, canonStale};
 * AC-2 healthy = sin issues de lint ni guard + canon al día; AC-3 reusa los checks (mockeamos
 * los módulos de dominio para ejercitar la orquestación y el cálculo de healthy).
 */
import { describe, it, expect, vi } from 'vitest'

const drM = vi.hoisted(() => ({
  buildSnapshot: vi.fn(async () => ({})),
  lintSnapshot: vi.fn((): { issues: Array<{ type: string; message: string }> } => ({ issues: [] })),
  guardCheck: vi.fn((): { ok: boolean; issues: Array<{ file: string; reason: string }> } => ({ ok: true, issues: [] })),
  canonStale: vi.fn(() => false),
}))
vi.mock('../src/context/snapshot', () => ({ buildSnapshot: drM.buildSnapshot }))
vi.mock('../src/auto/lint', () => ({ lintSnapshot: drM.lintSnapshot }))
vi.mock('../src/guard/index', () => ({ guardCheck: drM.guardCheck }))
vi.mock('../src/canon/stale', () => ({ canonStale: drM.canonStale }))
// bun:sqlite shim (igual que cli.test.ts) en caso de que el dynamic-import toque graph.
vi.mock('bun:sqlite', () => {
  const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')
  return {
    Database: class extends DatabaseSync {
      constructor(path: string) { super(path) }
      query() { return this }
    },
  }
})

describe('doctor (self-check del deck)', () => {
  it('healthy=true cuando lint y guard ok y canon al día (AC-1/2)', async () => {
    const { doctor } = await import('../src/doctor/index')
    const res = await doctor('/tmp/proj')
    expect(res.healthy).toBe(true)
    expect(res.lint.issues).toEqual([])
    expect(res.guard.ok).toBe(true)
    expect(res.canonStale).toBe(false)
  })

  it('healthy=false si lint tiene issues (AC-2)', async () => {
    drM.lintSnapshot.mockReturnValue({ issues: [{ type: 'missing', message: 'x' }] })
    const { doctor } = await import('../src/doctor/index')
    const res = await doctor('/tmp/proj')
    expect(res.healthy).toBe(false)
    expect(res.lint.issues).toHaveLength(1)
  })

  it('healthy=false si guard NO ok (fail-closed) (AC-2)', async () => {
    drM.guardCheck.mockReturnValueOnce({ ok: false, issues: [{ file: 'a.ts', reason: 'secret' }] })
    const { doctor } = await import('../src/doctor/index')
    const res = await doctor('/tmp/proj')
    expect(res.healthy).toBe(false)
    expect(res.guard.ok).toBe(false)
  })

  it('healthy=false si el canon está stale (AC-2)', async () => {
    drM.canonStale.mockReturnValueOnce(true)
    const { doctor } = await import('../src/doctor/index')
    const res = await doctor('/tmp/proj')
    expect(res.healthy).toBe(false)
    expect(res.canonStale).toBe(true)
  })

  it('reusa los 4 checks (AC-3): los llama con el projectDir', async () => {
    const { doctor } = await import('../src/doctor/index')
    await doctor('/tmp/otro')
    expect(drM.buildSnapshot).toHaveBeenCalledWith('/tmp/otro')
    expect(drM.lintSnapshot).toHaveBeenCalled()
    expect(drM.guardCheck).toHaveBeenCalledWith('/tmp/otro')
    expect(drM.canonStale).toHaveBeenCalledWith('/tmp/otro')
  })
})
