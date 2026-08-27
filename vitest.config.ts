import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // cap de recursos (OOM/CPU fix 2026-08-27): maxWorkers 1 → UN solo worker.
    // El mutation (stryker) recompila el binario por mutante; 4 workers × 2 runners = 8 procesos
    // que matan la CPU. Con 1 worker + concurrency 1 = 1 solo proceso, seguro.
    maxWorkers: 1,
    minWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
  },
})
