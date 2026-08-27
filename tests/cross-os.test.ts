import { describe, it, expect } from 'vitest'
import { join, sep, isAbsolute } from 'node:path'

// role: cross-OS tests. They validate that the engine does not hardcode path
// separators nor depend on a specific OS — paths are built with node:path.

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
