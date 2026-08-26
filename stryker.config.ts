// rol: Configuración de Stryker (mutation testing, Mandamiento 10).
// Timeboxed y scoped a lo cambiado (optimización 2026, DEC-002).
import { defineConfig } from '@stryker-mutator/core'

export default defineConfig({
  testRunner: 'vitest',
  mutator: 'typescript',
  packageManager: 'pnpm',
  reporters: ['clear-text', 'html'],
  coverageAnalysis: 'perTest',
  // cap de recursos (OOM fix 2026-08-26): concurrency default = n-1 cores (11) →
  // 51 workers tinypool. 4 controla RAM sin perder realismo del score.
  concurrency: 4,
  maxTestRunnerReuse: 100,
  cleanTempDir: 'always',
  mutate: ['src/**/*.ts'],
  timeoutMs: 30000,
  // mutation incremental (DEC-002): solo lo cambiado, no todo el repo
  incremental: true,
  incrementalFile: '.stryker/inc.json',
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },
})
