import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// mock bun:sqlite → node:sqlite (same API) so vitest (node) can resolve graph.ts/queries.ts
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

/** Helper: runs main() capturing console.log; intercepts process.exit as a throw. */
async function runCli(args: string[]): Promise<string[]> {
  const { main } = await import('../src/cli')
  const logged: string[] = []
  const spy = vi.spyOn(console, 'log').mockImplementation((s: unknown) => { logged.push(String(s)) })
  const realExit = process.exit
  // process.exit → throw a marker so vitest is not killed
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

// role: tests for the CLI (AC-4 dashboard, AC-14 agent-friendly: JSON output, exit codes).

describe('cli', () => {
  let dir: string
  let originalCwd: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-cli-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export function hello(): string { return "hi" }\n')
    writeFileSync(join(dir, 'package.json'), '{"name":"probe","type":"module"}\n')
    originalCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(dir, { recursive: true, force: true })
  })

  it('dashboard content-first imprime JSON por defecto (AC-4, AC-14)', async () => {
    const logged = await runCli([])
    const json = logged.find((l) => l.startsWith('{'))
    expect(json).toBeDefined()
    expect(json).toContain('"stack"')
    expect(json).toContain('"counts"')
  })

  it('init indexa el proyecto y devuelve JSON con nodes/edges', async () => {
    const logged = await runCli(['init', dir])
    const json = logged.find((l) => l.startsWith('{'))
    expect(json).toBeDefined()
    expect(json).toContain('"indexed"')
  })

  it('version devuelve JSON con name y version', async () => {
    const logged = await runCli(['--version'])
    const json = logged.find((l) => l.startsWith('{'))
    expect(json).toBeDefined()
    expect(json).toContain('"netrunner"')
    expect(logged[0]).toContain('"0.7.5"')
  })
})
