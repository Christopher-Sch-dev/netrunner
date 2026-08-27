import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { versionsInfo } from '../src/context/versions'

// rol: tests del detector de versiones (AC-1..4 de features/versions.feature).

describe('detector de versiones', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-versions-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('package.json con deps prod y dev: separa y ordena (AC-1/2/4)', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'probe',
        dependencies: { react: '^18.0.0', zod: '^4.0.0' },
        devDependencies: { vitest: '^2.0.0' },
      }),
    )

    const info = versionsInfo(dir)

    expect(info.prod.react).toBe('^18.0.0')
    expect(info.prod.zod).toBe('^4.0.0')
    expect(info.dev.vitest).toBe('^2.0.0')
    // ordenado alfabéticamente
    expect(Object.keys(info.prod)).toEqual(['react', 'zod'])
  })

  it('sin package.json → { prod: {}, dev: {} } (AC-3, no falla)', () => {
    const info = versionsInfo(dir)
    expect(info).toEqual({ prod: {}, dev: {} })
  })
})
