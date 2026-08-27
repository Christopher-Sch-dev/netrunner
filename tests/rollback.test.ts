import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSnapshot, listSnapshots, restoreSnapshot } from '../src/rollback/index'

// role: tests for rollback (AC-1..4 of features/rollback.feature). Backup/restore of state.

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
    // I mutate the file
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 999\n')

    restoreSnapshot(dir, snap.id)

    const restored = readFileSync(join(dir, 'src', 'a.ts'), 'utf8')
    expect(restored).toContain('x = 1')
  })

  it('sin backups → { snapshots: [] } (AC-4, no falla)', () => {
    const list = listSnapshots(dir)
    expect(list.snapshots).toEqual([])
  })

  it('bloquea path traversal en restore (fix RCE del juez de seguridad)', () => {
    // crea un snapshot malicioso con un path que escapa del proyecto
    mkdirSync(join(dir, '.netrunner', 'backups'), { recursive: true })
    const evil = { id: 'snap-evil', files: { '../../../../tmp/PWNED': 'pwned' }, mtime: 0 }
    writeFileSync(join(dir, '.netrunner', 'backups', 'snap-evil.json'), JSON.stringify(evil))

    expect(() => restoreSnapshot(dir, 'snap-evil')).toThrow(/path traversal/)
  })

  it('no guarda secrets en el snapshot (fix fuga de secrets)', () => {
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const x = 1\n')
    writeFileSync(join(dir, '.env'), 'SECRET=ghp_1234567890\n')

    const snap = createSnapshot(dir)

    expect(Object.keys(snap.files)).not.toContain('.env')
  })

  it('bloquea symlink escape en restore (fix juez hacker: writeFileSync sigue symlinks)', () => {
    // crea un symlink dentro del proyecto que apunta FUERA
    const outside = join(dir, '..', 'pwned-outside.txt')
    mkdirSync(join(dir, 'src'), { recursive: true })
    try { writeFileSync(outside, 'original') } catch { /* */ }
    mkdirSync(join(dir, '.netrunner', 'backups'), { recursive: true })
    // snapshot con un path que ES un symlink a un archivo fuera del proyecto
    const evil = { id: 'snap-link', files: { 'src/link.txt': 'pwned' }, mtime: 0 }
    writeFileSync(join(dir, '.netrunner', 'backups', 'snap-link.json'), JSON.stringify(evil))
    // el target src/link.txt es un symlink a un archivo fuera
    symlinkSync(outside, join(dir, 'src', 'link.txt'))

    // si el realpath de src/ apunta dentro del proyecto, el symlink no debería poder escribirse fuera
    expect(() => restoreSnapshot(dir, 'snap-link')).toThrow(/symlink escape|path traversal/)
  })
})
