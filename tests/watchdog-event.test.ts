import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { watchProject } from '../src/watchdog/index'
import { pendingSignals } from '../src/hooks/index'

// role: tests for watchdog-event (AC-1..6 of features/watchdog-event.feature).
// File watcher real (fs.watch recursivo) — emite señal 'cambio' en tiempo real, sin polling.

/** rol: espera hasta que la condición se cumpla o timeout (para eventos async). */
async function waitFor(cond: () => boolean, ms = 3000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (cond()) return true
    await new Promise((r) => setTimeout(r, 20))
  }
  return cond()
}

describe('watchdog-event (file watcher real)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'netrunner-watchdog-event-'))
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1\n')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('cambio real → emite señal cambio en tiempo real (AC-1/2)', async () => {
    const w = watchProject(dir, { debounceMs: 50 })
    try {
      // modifica un archivo real (no mtime futuro)
      writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 2\n')
      const ok = await waitFor(() => pendingSignals(dir).some((s) => s.type === 'cambio'))
      expect(ok).toBe(true)
    } finally {
      w.close()
    }
  })

  it('ignora ruido en node_modules (AC-3)', async () => {
    const w = watchProject(dir, { debounceMs: 50 })
    try {
      mkdirSync(join(dir, 'node_modules', 'pkg'), { recursive: true })
      writeFileSync(join(dir, 'node_modules', 'pkg', 'x.js'), 'x\n')
      await new Promise((r) => setTimeout(r, 300))
      expect(pendingSignals(dir).some((s) => s.type === 'cambio')).toBe(false)
    } finally {
      w.close()
    }
  })

  it('debounce: ráfaga de eventos → UNA señal (AC-4)', async () => {
    const w = watchProject(dir, { debounceMs: 100 })
    try {
      // ráfaga de writes en el mismo archivo
      for (let i = 0; i < 5; i++) writeFileSync(join(dir, 'src', 'a.ts'), `export const a = ${i}\n`)
      const ok = await waitFor(() => pendingSignals(dir).some((s) => s.type === 'cambio'))
      expect(ok).toBe(true)
      // espera a que pase el debounce y no lleguen más
      await new Promise((r) => setTimeout(r, 250))
      const cambios = pendingSignals(dir).filter((s) => s.type === 'cambio')
      expect(cambios.length).toBe(1)
    } finally {
      w.close()
    }
  })

  it('close() detiene el watcher (AC-5)', async () => {
    const w = watchProject(dir, { debounceMs: 50 })
    w.close()
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 3\n')
    await new Promise((r) => setTimeout(r, 300))
    expect(pendingSignals(dir).some((s) => s.type === 'cambio')).toBe(false)
  })
})
