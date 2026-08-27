// rol: Configuración de Stryker (mutation testing, Mandamiento 10).
// Timeboxed y scoped a lo cambiado (optimización 2026, DEC-002).
import { defineConfig } from '@stryker-mutator/core'

export default defineConfig({
  testRunner: 'vitest',
  mutator: 'typescript',
  packageManager: 'pnpm',
  // reporters: solo clear-text (sin html: genera .stryker/ pesado)
  reporters: ['clear-text'],
  coverageAnalysis: 'perTest',
  // cap de recursos (OOM fix 2026-08-26): concurrency 2 → RAM liviana,
  // no revienta la PC aunque corran otros proyectos.
  concurrency: 2,
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
