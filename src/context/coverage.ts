/**
 * rol: Netrunner test coverage detector (Wave 6 — self-generating skill).
 * Reads the project coverage % from coverage/coverage-summary.json
 * (vitest/istanbul json-summary format). It is the basis of the coverage feature:
 * "what percentage of the whole project and the tests filled in or current".
 *
 * SPEC (Mandamiento 0):
 *   As an agent operating a Netrunner project,
 *   I want to know the test coverage %,
 *   so that the self-generating skill documents what is covered.
 *
 * AC (features/coverage.feature):
 *   AC-1 coverageInfo(dir) → { lines, functions, branches, statements }.
 *   AC-2 reads coverage/coverage-summary.json (json-summary).
 *   AC-3 no coverage → 0 everywhere (does not fail).
 *   AC-4 the % are numbers (0-100).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** Project test coverage (%). */
export interface CoverageInfo {
  lines: number
  functions: number
  branches: number
  statements: number
}

/** rol: returns the project coverage (deterministic, does not fail without coverage). */
export function coverageInfo(projectDir: string): CoverageInfo {
  const path = join(projectDir, 'coverage', 'coverage-summary.json')
  if (!existsSync(path)) return { lines: 0, functions: 0, branches: 0, statements: 0 }
  try {
    const data = JSON.parse(readFileSync(path, 'utf8')) as {
      total?: { lines?: { pct?: number }, functions?: { pct?: number }, branches?: { pct?: number }, statements?: { pct?: number } }
    }
    const total = data.total ?? {}
    return {
      lines: total.lines?.pct ?? 0,
      functions: total.functions?.pct ?? 0,
      branches: total.branches?.pct ?? 0,
      statements: total.statements?.pct ?? 0,
    }
  } catch {
    return { lines: 0, functions: 0, branches: 0, statements: 0 } // invalid → does not fail
  }
}
