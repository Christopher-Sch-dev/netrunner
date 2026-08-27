import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateDocs } from '../src/generate/index'

// rol: tests del generador de doc viva (AC-1..4 de features/generate.feature).

describe('generador de doc viva', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-generate-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('genera README.generated.md desde el snapshot (AC-1/2)', () => {
    mkdirSync(join(dir, '.git'), { recursive: true })
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/develop\n')
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'probe', dependencies: { react: '^18' } }))

    const result = generateDocs(dir)

    const readmePath = join(dir, 'README.generated.md')
    expect(existsSync(readmePath)).toBe(true)
    const readme = readFileSync(readmePath, 'utf8')
    expect(readme).toContain('develop') // branch
    expect(readme).toContain('react') // versiones
    expect(result.written).toContain('README.generated.md')
  })

  it('idempotente: re-generar no duplica (AC-4)', () => {
    generateDocs(dir)
    const first = readFileSync(join(dir, 'README.generated.md'), 'utf8')
    generateDocs(dir)
    const second = readFileSync(join(dir, 'README.generated.md'), 'utf8')
    expect(second).toBe(first)
  })
})
