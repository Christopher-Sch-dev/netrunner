import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeProgram } from '../src/program/index'

// role: tests for program.md (AC-1..4 of features/program.feature).
// El contrato del programa que el agente lee al conectar.

describe('program.md (contrato del programa)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-program-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('genera program.md con nombre + comandos + tools (AC-1/2)', () => {
    writeProgram(dir)
    const path = join(dir, 'program.md')
    expect(existsSync(path)).toBe(true)
    const content = readFileSync(path, 'utf8')
    expect(content).toContain('netrunner')
    expect(content).toContain('explore')
  })

  it('idempotente (AC-3)', () => {
    writeProgram(dir)
    const first = readFileSync(join(dir, 'program.md'), 'utf8')
    writeProgram(dir)
    const second = readFileSync(join(dir, 'program.md'), 'utf8')
    expect(second).toBe(first)
  })
})
