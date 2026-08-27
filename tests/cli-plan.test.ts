import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// mock bun:sqlite → node:sqlite (mismo API) para que vitest (node) resuelva graph.ts/queries.ts
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

/** Helper: corre main() capturando console.log; intercepta process.exit como throw. */
async function runCli(args: string[]): Promise<string[]> {
  const { main } = await import('../src/cli')
  const logged: string[] = []
  const spy = vi.spyOn(console, 'log').mockImplementation((s: unknown) => { logged.push(String(s)) })
  const realExit = process.exit
  ;(process as unknown as { exit: (c?: number) => never }).exit = ((code?: number) => {
    throw new Error(`__EXIT__${code ?? 0}`)
  }) as never
  try {
    await main(args)
  } catch (e) {
    if (!(e instanceof Error && e.message.startsWith('__EXIT__'))) throw e
  } finally {
    spy.mockRestore()
    ;(process as unknown as { exit: (c?: number) => never }).exit = realExit
  }
  return logged
}

// rol: tests del CLI plan real + TOON (AC-1..4 del features/cli-plan.feature)

describe('cli plan (real + TOON)', () => {
  let dir: string
  let originalCwd: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-plan-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export function hello(): string { return "hi" }\n')
    writeFileSync(join(dir, 'src', 'b.ts'), 'export function auth(): string { return "ok" }\n')
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","type":"module"}\n')
    originalCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(dir, { recursive: true, force: true })
  })

  it('plan genera pasos accionables desde el contexto (AC-1/2)', async () => {
    const logged = await runCli(['plan', 'agregar login'])
    const json = logged.find((l) => l.startsWith('{'))
    expect(json).toBeDefined()
    const parsed = JSON.parse(json!)
    expect(parsed.plan).toBeDefined()
    expect(parsed.plan.goal).toBe('agregar login')
    // steps[] accionables
    expect(Array.isArray(parsed.plan.steps)).toBe(true)
    expect(parsed.plan.steps.length).toBeGreaterThan(0)
    // cada step tiene action + target concreto
    for (const step of parsed.plan.steps) {
      expect(step.action).toBeTruthy()
      expect(step.target).toBeTruthy()
    }
  })

  it('output TOON por defecto (sin campo context verboso) (AC-3)', async () => {
    const logged = await runCli(['plan', 'hacer X'])
    const json = logged.find((l) => l.startsWith('{'))
    const parsed = JSON.parse(json!)
    // TOON: no hay campo "context" duplicando el dashboard verboso
    expect(parsed.plan.context).toBeUndefined()
    // campos mínimos y útiles
    expect(parsed.plan.steps).toBeDefined()
  })

  it('plan sin goal → error estructurado (AC-4)', async () => {
    // sin goal → plan lanza fail() que imprime error a stderr y hace exit(2)
    const logged = await runCli(['plan'])
    expect(logged).toEqual([]) // no imprime JSON a stdout
  })
})
