import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runOp } from '../src/tools/ops'

// rol: tests del timebox (AC-1..4 de features/timebox.feature).
// Un test que cuelga no cuelga el loop del agente.

describe('timebox por operación', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-timebox-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('operación que cuelga → timeout (AC-1/2)', async () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","scripts":{"test":"sleep 10"}}\n')
    writeFileSync(join(dir, 'pnpm-lock.yaml'), '')

    const r = await runOp('test', dir, 1000)

    expect(r.ok).toBe(false)
    expect(r.exitCode).toBe(-1)
    expect(r.output).toMatch(/timeout|timed out/i)
  })

  it('operación normal → termina a tiempo (AC-4)', async () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","scripts":{"test":"echo ok"}}\n')
    writeFileSync(join(dir, 'pnpm-lock.yaml'), '')

    const r = await runOp('test', dir, 30000)

    expect(r.ok).toBe(true)
    expect(r.exitCode).toBe(0)
  })
})
