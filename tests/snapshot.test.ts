import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildSnapshot, saveSnapshot, loadSnapshot } from '../src/context/snapshot'

// rol: tests del snapshot store (AC-1..4 de features/snapshot.feature).
// El "sticky note" vivo que une los detectores.

describe('snapshot store', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-snapshot-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('buildSnapshot une los detectores (AC-1)', () => {
    mkdirSync(join(dir, '.git'), { recursive: true })
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/develop\n')
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'probe', dependencies: { react: '^18' } }))

    const snap = buildSnapshot(dir)

    expect(snap.git.branch).toBe('develop')
    expect(snap.versions.prod.react).toBe('^18')
    expect(snap.coverage).toBeDefined()
    expect(snap.services).toBeDefined()
    expect(snap.dirs).toBeDefined()
    expect(snap.todos).toBeDefined()
    expect(snap.mtime).toBeGreaterThan(0)
  })

  it('save + load roundtrip (AC-2/3)', () => {
    const snap = buildSnapshot(dir)
    saveSnapshot(dir, snap)

    const loaded = loadSnapshot(dir)
    expect(loaded).not.toBeNull()
    expect(loaded!.git).toEqual(snap.git)
    expect(loaded!.versions).toEqual(snap.versions)
  })

  it('loadSnapshot sin snapshot → null (AC-3)', () => {
    expect(loadSnapshot(dir)).toBeNull()
  })
})
