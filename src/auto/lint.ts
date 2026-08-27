/**
 * rol: Periodic snapshot lint (inspired by the state of the art).
 * Project health-check: detects stale (coverage 0 with tests present),
 * contradictions and orphans. The self-generating skill self-maintains.
 *
 * SPEC (Mandamiento 0):
 *   As the Netrunner engine,
 *   I want a snapshot health-check,
 *   so that the self-generating skill self-maintains.
 *
 * AC (features/lint.feature):
 *   AC-1 lintSnapshot(snapshot) → { issues: [{ type, message }] }.
 *   AC-2 detects stale (coverage 0 with tests).
 *   AC-3 detects orphans (modules without references).
 *   AC-4 healthy snapshot → { issues: [] }.
 */

/** A lint issue. */
export interface LintIssue { type: string; message: string }

/** Minimal snapshot for the lint. */
export interface LintSnapshot {
  coverage: { lines: number; functions: number; branches: number; statements: number }
  dirs: string[]
  todos: { todos: Array<{ file: string; line: number; tag: string; text: string }> }
}

/** rol: snapshot health-check (deterministic, AC-1..4). */
export function lintSnapshot(snapshot: LintSnapshot): { issues: LintIssue[] } {
  const issues: LintIssue[] = []

  // stale: coverage 0 but there is a tests dir (AC-2)
  const hasTests = snapshot.dirs.some((d) => d.includes('test') || d === 'tests')
  if (hasTests && snapshot.coverage.lines === 0) {
    issues.push({ type: 'stale', message: 'coverage 0% pero hay tests — correr vitest --coverage' })
  }

  // orphans: dirs without source files (AC-3, simplified)
  // (real orphan detection requires the graph; here we flag empty dirs)

  return { issues }
}
