import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { guardCheck } from '../src/guard/index'

// role: tests for guard imports rotos (AC-1..4 of features/guard-imports.feature).
// Señal externa REAL (M8): el guard debe detectar imports a módulos inexistentes.

describe('guard valida imports rotos (señal externa real)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-guard-imp-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('detecta import a módulo inexistente (AC-1)', () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'b.ts'), 'export const b = 1\n')
    writeFileSync(join(dir, 'src', 'a.ts'), "import { b } from './b'\nimport { x } from './nonexistent'\nexport const a = b\n")

    const result = guardCheck(dir)

    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.reason.includes('import') && i.reason.includes('roto'))).toBe(true)
  })

  it('NO detecta falsos positivos con import válido (AC-3)', () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'b.ts'), 'export const b = 1\n')
    writeFileSync(join(dir, 'src', 'a.ts'), "import { b } from './b'\nexport const a = b\n")

    const result = guardCheck(dir)

    expect(result.issues.some((i) => i.reason.includes('import'))).toBe(false)
  })

  it('sigue detectando secrets (AC-2)', () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'const token = "ghp_1234567890abcdef"\n')

    const result = guardCheck(dir)

    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.reason.includes('secret'))).toBe(true)
  })
})
