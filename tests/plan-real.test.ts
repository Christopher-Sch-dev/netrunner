import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generatePlan } from '../src/plan/index'

// mock bun:sqlite → node:sqlite (para que graph.ts resuelva)
vi.mock('bun:sqlite', () => {
  const { DatabaseSync } = require('node:sqlite')
  return {
    Database: class extends DatabaseSync {
      constructor(path: string) { super(path) }
      query(sql: string) {
        const db = this
        return {
          get: (...args: unknown[]) => (db.prepare(sql) as { get: (...a: unknown[]) => unknown }).get(...args),
          all: (...args: unknown[]) => (db.prepare(sql) as { all: (...a: unknown[]) => unknown }).all(...args),
          run: (...args: unknown[]) => (db.prepare(sql) as { run: (...a: unknown[]) => unknown }).run(...args),
        }
      }
    },
  }
})

// role: tests for plan real basado en el grafo (AC-1..4 of features/plan-real.feature).
// El plan no es un stub genérico — deriva pasos del grafo y del goal.

describe('plan real basado en el grafo', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-plan-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'login.ts'), 'export function login() { return true }\n')
    writeFileSync(join(dir, 'src', 'app.ts'), "import { login } from './login'\nexport function app() { return login() }\n")
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('goal menciona un símbolo → el plan lo usa (AC-1/3)', async () => {
    const plan = await generatePlan('agregar validación a login', dir)
    expect(plan.steps.some((s) => s.target.includes('login'))).toBe(true)
    expect(plan.steps.length).toBeGreaterThan(1)
  })

  it('plan incluye pasos accionables del grafo (AC-2)', async () => {
    const plan = await generatePlan('arreglar un bug', dir)
    // debe tener explore + operar (op.test) + verify — no solo explore+verify genérico
    const actions = plan.steps.map((s) => s.action)
    expect(actions).toContain('explore')
    expect(actions).toContain('op.test') // operar con señal externa (accionable)
    expect(actions).toContain('verify')
    expect(plan.steps.length).toBeGreaterThan(2)
  })

  it('determinista (AC-4)', async () => {
    const a = await generatePlan('arreglar un bug', dir)
    const b = await generatePlan('arreglar un bug', dir)
    // comparar la secuencia de acciones (determinista; targets pueden variar por callers count)
    expect(a.steps.map((s) => s.action)).toEqual(b.steps.map((s) => s.action))
  })
})
