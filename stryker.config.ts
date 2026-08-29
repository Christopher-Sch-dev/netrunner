// rol: Configuración de Stryker (mutation testing, Mandamiento 10).
// Timeboxed y scoped a lo cambiado (optimización 2026, DEC-002).
import { defineConfig } from '@stryker-mutator/core'

export default defineConfig({
  testRunner: 'vitest',
  mutator: 'typescript',
  packageManager: 'pnpm',
  // plugins explícito (pitfall skill test-stack-validation): con pnpm hoisting
  // Stryker NO auto-detecta el vitest-runner; sin el array falla con
  // "Cannot find TestRunner plugin vitest".
  plugins: ['@stryker-mutator/vitest-runner'],
  // reporters: solo clear-text (sin html: genera .stryker/ pesado)
  reporters: ['clear-text'],
  coverageAnalysis: 'perTest',
  // ignoreStatic (P30 skill stryker-ts-mutation): compatible con perTest, salta los
  // mutantes estáticos (data arrays) que cuestan ~87% del runtime. En repos data-heavy
  // corta de ~15-30min a ~5min. NO usar con coverageAnalysis 'all' (incompatible).
  ignoreStatic: true,
  // cap de recursos (OOM/CPU fix 2026-08-27): concurrency 1 + maxWorkers 1 → UN solo proceso,
  // no 8 (2 runners × 4 workers). El mutation es CPU-intensivo (recompila el binario por mutante);
  // correrlo en paralelo mata la CPU. Solo correr cuando la PC esté libre.
  concurrency: 1,
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
