import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rgSearch, type RgMatch } from '../src/tools/rg'

// rol: tests del conector ripgrep (AC-1..4 de features/rg.feature).

describe('rgSearch (conector ripgrep)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-rg-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('busca un patrón y devuelve matches tipados con file/line/text (AC-1)', async () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export function login(): string { return "x" }\n')

    const matches = await rgSearch('login', dir)

    expect(matches.length).toBeGreaterThan(0)
    const first = matches[0]
    expect(first.file).toContain('a.ts')
    expect(first.line).toBeGreaterThan(0)
    expect(first.text).toContain('login')
  })

  it('respeta .gitignore: no busca en node_modules (AC-2)', async () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    mkdirSync(join(dir, 'node_modules'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.js'), 'const login = 2\n')
    writeFileSync(join(dir, 'node_modules', 'dep.js'), 'const login = 1\n')
    writeFileSync(join(dir, '.gitignore'), 'node_modules/\n')

    const matches = await rgSearch('login', dir)

    // node_modules excluido determinista (--glob), src sí se busca
    expect(matches.some((m) => m.file.includes('src/a.js'))).toBe(true)
    expect(matches.every((m) => !m.file.includes('node_modules'))).toBe(true)
  })

  it('acota el output a un límite para no quemar tokens (AC-4)', async () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    for (let i = 0; i < 300; i++) {
      writeFileSync(join(dir, 'src', `f${i}.ts`), `const match_${i} = 1\n`)
    }

    const matches = await rgSearch('match_', dir)

    expect(matches.length).toBeLessThanOrEqual(200) // límite TOON
  })
})
