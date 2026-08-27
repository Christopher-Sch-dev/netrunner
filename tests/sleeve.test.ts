import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exportSleeve, importSleeve } from '../src/sleeve/index'

// role: tests for net sleeve (AC-1..4 of features/sleeve.feature).
// El deck portable que se re-adhiere a otro proyecto (Construct).

describe('net sleeve (deck portable)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-sleeve-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('sin estado → sleeve vacío (AC-3)', () => {
    const sleeve = exportSleeve(dir)
    expect(sleeve.decisions).toEqual([])
    expect(sleeve.history.operations).toEqual([])
  })

  it('exporta + importa el estado (AC-1/2)', () => {
    // crea una decisión
    mkdirSync(join(dir, '.netrunner', 'decisions'), { recursive: true })
    writeFileSync(join(dir, '.netrunner', 'decisions', 'mi-decision.md'), '---\nstatus: open\n---\n# Mi decisión\n')
    // exporta
    const sleeve = exportSleeve(dir)
    expect(sleeve.decisions.length).toBeGreaterThan(0)
    // importa en otro proyecto
    const dest = mkdtempSync(join(tmpdir(), 'netrunner-sleeve-dest-'))
    importSleeve(dest, sleeve)
    const re = exportSleeve(dest)
    expect(re.decisions.length).toBeGreaterThan(0)
    rmSync(dest, { recursive: true, force: true })
  })
})
