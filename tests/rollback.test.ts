import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSnapshot, listSnapshots, restoreSnapshot } from '../src/rollback/index'

// rol: tests de rollback (AC-1..4 de features/rollback.feature). Backup/restore del estado.

describe('snapshot rollback', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-rollback-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('crea y lista un snapshot (AC-1/2)', () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 1\n')

    const snap = createSnapshot(dir)
    const list = listSnapshots(dir)

    expect(list.snapshots.length).toBeGreaterThan(0)
    expect(list.snapshots[0].id).toBe(snap.id)
  })

  it('restaura un snapshot (AC-3)', () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 1\n')

    const snap = createSnapshot(dir)
    // muto el archivo
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 999\n')

    restoreSnapshot(dir, snap.id)

    const restored = readFileSync(join(dir, 'src', 'a.ts'), 'utf8')
    expect(restored).toContain('x = 1')
  })

  it('sin backups → { snapshots: [] } (AC-4, no falla)', () => {
    const list = listSnapshots(dir)
    expect(list.snapshots).toEqual([])
  })
})
