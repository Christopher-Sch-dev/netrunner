/**
 * rol: Detector de cobertura de tests de Netrunner (Wave 6 — skill auto-generante).
 * Lee el % de cobertura del proyecto desde coverage/coverage-summary.json
 * (formato vitest/istanbul json-summary). Es la base de la feature de Cris:
 * "qué porcentaje del proyecto completo y los tests rellenados o actuales".
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que opera un proyecto Netrunner,
 *   quiero conocer el % de cobertura de tests,
 *   para que la skill auto-generante documente qué está cubierto.
 *
 * AC (features/coverage.feature):
 *   AC-1 coverageInfo(dir) → { lines, functions, branches, statements }.
 *   AC-2 lee coverage/coverage-summary.json (json-summary).
 *   AC-3 sin coverage → 0 en todo (no falla).
 *   AC-4 los % son números (0-100).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** Cobertura de tests del proyecto (%). */
export interface CoverageInfo {
  lines: number
  functions: number
  branches: number
  statements: number
}

/** rol: devuelve la cobertura del proyecto (determinista, no falla sin coverage). */
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
    return { lines: 0, functions: 0, branches: 0, statements: 0 } // inválido → no falla
  }
}
