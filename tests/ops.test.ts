import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runOp } from '../src/tools/ops'

// rol: tests de ops (AC-1..5 de features/ops.feature). Control determinista del proyecto.

describe('ops (control determinista)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-ops-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('ejecuta test del stack (pnpm) y devuelve exitCode (AC-1/2)', async () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","scripts":{"test":"echo test-ok"}}\n')
    writeFileSync(join(dir, 'pnpm-lock.yaml'), '')

    const r = await runOp('test', dir)

    expect(r.ok).toBe(true)
    expect(typeof r.exitCode).toBe('number')
    expect(r.output).toContain('test-ok')
  })

  it('operación desconocida → error (AC-4, no inventa)', async () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"probe"}\n')
    await expect(runOp('deploy', dir)).rejects.toThrow(/unknown|no soportada/i)
  })

  it('respeta el packageManager detectado (AC-5)', async () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","scripts":{"test":"echo npm-ok"}}\n')
    writeFileSync(join(dir, 'package-lock.json'), '')

    const r = await runOp('test', dir)

    expect(r.ok).toBe(true)
    expect(r.output).toContain('npm-ok')
  })
})
