/**
 * rol: tests DIRECTOS de src/doctor/index.ts con CÓDIGO REAL (fixtures de fs)
 * — NO se mockea el dominio. doctor() combina buildSnapshot + lintSnapshot +
 * guardCheck + canonStale, todos lectores de fs puros (coverage/dirs/todos/
 * detect no tocan bun:sqlite). Al ejercitar el código real sobre fixtures y
 * usar IMPORT ESTÁTICO al top (igual que gate.test.ts), Stryker correlaciona
 * coverage perTest y mata los mutantes de verdad. (El test anterior del
 * subagente usaba vi.mock del dominio + await import() dinámico →
 * "Ran 0.00 tests per mutant" → 0 killed / timeout = FAKE 100%, patrón P33.)
 *
 * AC (spec en src/doctor/index.ts):
 *   AC-1 doctor(dir) → { healthy, lint, guard, canonStale }.
 *   AC-2 healthy = sin issues de lint ni guard + canon al día.
 *   AC-3 reusa los checks (no duplica lógica).
 */
import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
// IMPORT ESTÁTICO al top (clave para que Stryker perTest correlacione coverage):
import { doctor } from '../src/doctor/index'
import { buildSnapshot } from '../src/context/snapshot'

/** Fixture: proyecto mínimo donde doctor() → healthy=true. */
function healthyFixture(): { dir: string; teardown: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'nr-doc-h-'))
  // coverage > 0 → lintSnapshot NO marca stale (incluso con dir tests presente)
  mkdirSync(join(dir, 'coverage'), { recursive: true })
  writeFileSync(
    join(dir, 'coverage', 'coverage-summary.json'),
    JSON.stringify({ total: { lines: { pct: 90 }, functions: { pct: 90 }, branches: { pct: 90 }, statements: { pct: 90 } } })
  )
  // canon AL DÍA: state/project.json con mtime MÁS VIEJO que README.generated
  mkdirSync(join(dir, '.netrunner', 'state'), { recursive: true })
  const canonPath = join(dir, 'README.generated.md')
  const statePath = join(dir, '.netrunner', 'state', 'project.json')
  writeFileSync(canonPath, '# canon\n')
  writeFileSync(statePath, '{}')
  const base = Date.now() / 1000
  utimesSync(canonPath, base, base) // canon = ahora
  utimesSync(statePath, base - 10, base - 10) // state 10s atrás → state < canon → NOT stale
  return { dir, teardown: () => rmSync(dir, { recursive: true, force: true }) }
}

describe('doctor (self-check del deck, código real)', () => {

  it('AC-1: healthy=true cuando lint+guard ok y canon al día', async () => {
    const f = healthyFixture()
    try {
      const res = await doctor(f.dir)
      expect(res.healthy).toBe(true)
      expect(res.lint.issues).toEqual([])
      expect(res.guard.ok).toBe(true)
      expect(res.canonStale).toBe(false)
    } finally { f.teardown() }
  })

  it('AC-2: healthy=false si lint tiene issues (coverage 0 + dir tests = stale)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nr-doc-l-'))
    try {
      writeFileSync(join(dir, '.gitignore'), 'node_modules\n')
      writeFileSync(join(dir, 'src.ts'), 'export const a = 1\n')
      mkdirSync(join(dir, 'tests'), { recursive: true })
      writeFileSync(join(dir, 'tests', 'x.test.ts'), 'import { test } from "vitest"; test("x", () => {})\n')
      const res = await doctor(dir)
      expect(res.healthy).toBe(false)
      expect(res.lint.issues.some((i) => i.type === 'stale')).toBe(true)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('AC-2: healthy=false si guard NO ok (archivo protegido) — fail-closed', async () => {
    const f = healthyFixture()
    try {
      // coverage 100 de f + canon ok → base healthy; agregamos .env → guard falla
      // (guardCheck recorre el árbol y detecta archivo protegido)
      const envPath = join(f.dir, 'sub', '.env')
      mkdirSync(join(f.dir, 'sub'), { recursive: true })
      writeFileSync(envPath, 'TOKEN=garbage\n')
      const res = await doctor(f.dir)
      expect(res.healthy).toBe(false)
      const guardIssues = res.guard.issues
      expect(res.guard.ok).toBe(false)
      expect(guardIssues.some((i) => i.reason.includes('protegido'))).toBe(true)
    } finally { f.teardown() }
  })

  it('AC-2: healthy=false si el canon está stale (README.generated anterior al estado)', async () => {
    const f = healthyFixture()
    try {
      const base = Date.now() / 1000
      const canonPath = join(f.dir, 'README.generated.md')
      const statePath = join(f.dir, '.netrunner', 'state', 'project.json')
      utimesSync(canonPath, base - 10, base - 10) // canon 10s atrás
      utimesSync(statePath, base, base) // state ahora → state > canon → STALE
      const res = await doctor(f.dir)
      expect(res.healthy).toBe(false)
      expect(res.canonStale).toBe(true)
    } finally { f.teardown() }
  })

  it('AC-3: buildSnapshot real retorna stack con manifest (no mock)', async () => {
    const f = healthyFixture()
    try {
      writeFileSync(join(f.dir, 'package.json'), '{"name":"x","devDependencies":{"vitest":"3"}}\n')
      writeFileSync(join(f.dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
      const snap = await buildSnapshot(f.dir)
      expect(snap.stack.language).toBe('typescript')
      expect(snap.mtime).toBeGreaterThan(0)
    } finally { f.teardown() }
  })
})
