import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { recordLatency, latencyPercentiles } from '../src/metrics/index'

// role: tests for m4-metrics (AC-1..4 of features/metrics.feature).
// p50/p95/p99 sobre los seams (M4: eslabón más débil, seams listos cero métricas).

describe('m4-metrics (p50/p95/p99)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-metrics-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('registra y calcula percentiles (AC-1/2)', () => {
    for (const ms of [10, 20, 30, 40, 100]) recordLatency(dir, 'op.test', ms)
    const p = latencyPercentiles(dir, 'op.test')
    expect(p?.p50).toBe(30)
    expect(p?.p95).toBe(100)
    expect(p?.p99).toBe(100)
    expect(p?.count).toBe(5)
  })

  it('sin datos → null (AC-4)', () => {
    expect(latencyPercentiles(dir, 'op.test')).toBeNull()
  })
})
