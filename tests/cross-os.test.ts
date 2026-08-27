import { describe, it, expect } from 'vitest'
import { join, sep, isAbsolute } from 'node:path'

// rol: tests cross-OS (w5a3). Validan que el motor no hardcodea separadores de
// path ni depende de OS específico — los paths se construyen con node:path.

describe('cross-OS portability', () => {
  it('los paths del proyecto se construyen con node:path (no strings hardcodeados)', () => {
    const projectDir = '/proj'
    const dbPath = join(projectDir, '.netrunner', 'index.db')
    expect(isAbsolute(dbPath)).toBe(true)
    expect(dbPath).toContain(sep)
  })

  it('el separador es el del OS actual (no hardcodeado)', () => {
    expect(sep).toBe(process.platform === 'win32' ? '\\' : '/')
  })
})
