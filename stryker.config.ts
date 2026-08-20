// rol: Configuración de Stryker (mutation testing, Mandamiento 10).
// Timeboxed y scoped a lo cambiado (optimización 2026, DEC-002).
import { defineConfig } from '@stryker-mutator/core'

export default defineConfig({
  testRunner: 'vitest',
  mutator: 'typescript',
  packageManager: 'pnpm',
  reporters: ['clear-text', 'html'],
  coverageAnalysis: 'perTest',
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
