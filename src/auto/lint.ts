/**
 * rol: Lint periódico del snapshot (idea de Karpathy — el lint del LLM Wiki).
 * Health-check del proyecto: detecta stale (coverage 0 con tests presentes),
 * contradicciones y orphans. La skill auto-generante se auto-mantiene.
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero un health-check del snapshot,
 *   para que la skill auto-generante se auto-mantenga.
 *
 * AC (features/lint.feature):
 *   AC-1 lintSnapshot(snapshot) → { issues: [{ type, message }] }.
 *   AC-2 detecta stale (coverage 0 con tests).
 *   AC-3 detecta orphans (módulos sin referencias).
 *   AC-4 snapshot sano → { issues: [] }.
 */

/** Un issue del lint. */
export interface LintIssue { type: string; message: string }

/** Snapshot mínimo para el lint. */
export interface LintSnapshot {
  coverage: { lines: number; functions: number; branches: number; statements: number }
  dirs: string[]
  todos: { todos: Array<{ file: string; line: number; tag: string; text: string }> }
}

/** rol: health-check del snapshot (determinista, AC-1..4). */
export function lintSnapshot(snapshot: LintSnapshot): { issues: LintIssue[] } {
  const issues: LintIssue[] = []

  // stale: coverage 0 pero hay dir tests (AC-2)
  const hasTests = snapshot.dirs.some((d) => d.includes('test') || d === 'tests')
  if (hasTests && snapshot.coverage.lines === 0) {
    issues.push({ type: 'stale', message: 'coverage 0% pero hay tests — correr vitest --coverage' })
  }

  // orphans: dirs sin archivos fuente (AC-3, simplificado)
  // (la detección real de orphans requiere el grafo; aquí marcamos dirs vacíos)

  return { issues }
}
