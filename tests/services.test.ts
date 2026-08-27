import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { servicesInfo } from '../src/context/services'

// rol: tests del detector de servicios (AC-1..4 de features/services.feature).

describe('detector de servicios', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-services-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('package.json con script dev que expone puerto (AC-1/2/4)', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'probe', scripts: { dev: 'vite --port 5173' } }),
    )

    const info = servicesInfo(dir)

    expect(info.services.length).toBeGreaterThan(0)
    const dev = info.services.find((s) => s.name === 'dev')
    expect(dev).toBeDefined()
    expect(dev!.port).toBe(5173)
    expect(dev!.url).toContain('5173')
  })

  it('sin servicios → { services: [] } (AC-3, no falla)', () => {
    const info = servicesInfo(dir)
    expect(info.services).toEqual([])
  })
})
