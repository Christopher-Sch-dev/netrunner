import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanProject } from '../src/scan/index'

// role: tests for scan (AC-1..4 of features/scan.feature). Project info overlay.

describe('scan (overlay de info)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-scan-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('scan unifica los detectores (AC-1/4)', async () => {
    mkdirSync(join(dir, '.git'), { recursive: true })
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/develop\n')
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'probe', dependencies: { react: '^18' } }))

    const scan = await scanProject(dir)

    expect(scan.git.branch).toBe('develop')
    expect(scan.versions.prod.react).toBe('^18')
    expect(scan.coverage).toBeDefined()
    expect(scan.services).toBeDefined()
    expect(scan.todos).toBeDefined()
  })

  it('sin datos → defaults (AC-2, no falla)', async () => {
    const scan = await scanProject(dir)
    expect(scan.git.branch).toBeNull()
    expect(scan.versions).toEqual({ prod: {}, dev: {} })
  })
})
