import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// mock bun:sqlite → node:sqlite (para que cli.ts resuelva graph.ts)
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

// rol: tests del CLI status (AC-1..4 de features/status.feature).

describe('cli status (sticky note vivo)', () => {
  let dir: string
  let originalCwd: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-status-'))
    mkdirSync(join(dir, '.git'), { recursive: true })
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/develop\n')
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'probe', dependencies: { react: '^18' } }))
    originalCwd = process.cwd()
    process.chdir(dir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(dir, { recursive: true, force: true })
  })

  it('status devuelve el snapshot (AC-1/3)', async () => {
    const logged = await runCli(['status'])
    const json = logged.find((l) => l.startsWith('{'))
    expect(json).toBeDefined()
    const parsed = JSON.parse(json!)
    expect(parsed.git.branch).toBe('develop')
    expect(parsed.versions.prod.react).toBe('^18')
  })

  it('--dir <path> tiene precedencia sobre process.cwd() (fix bug cwd)', async () => {
    // corre status --dir <dir> desde un cwd distinto (tmp) → debe operar dir, no cwd
    const otherCwd = mkdtempSync(join(tmpdir(), 'netrunner-othercwd-'))
    const original = process.cwd()
    process.chdir(otherCwd)
    try {
      const logged = await runCli(['--dir', dir, 'status'])
      const json = logged.find((l) => l.startsWith('{'))
      const parsed = JSON.parse(json!)
      expect(parsed.git.branch).toBe('develop')
    } finally {
      process.chdir(original)
      rmSync(otherCwd, { recursive: true, force: true })
    }
  })

  it('--help devuelve la lista de comandos (fix --help)', async () => {
    const logged = await runCli(['--help'])
    const json = logged.find((l) => l.startsWith('{'))
    expect(json).toBeDefined()
    const parsed = JSON.parse(json!)
    expect(parsed.commands).toContain('init')
    expect(parsed.commands).toContain('map')
  })
})
