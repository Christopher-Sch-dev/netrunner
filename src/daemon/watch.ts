/**
 * rol: daemon-watch — daemon residente con intervalos (features/daemon-watch.feature).
 * LA VISION: el "curator fantasma" de Rache Bartmoss vigila el proyecto continuamente.
 * Corre daemonTick en bucle con intervalos; maxTicks permite testear (o infinito en CLI --watch).
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero que el daemon corra en bucle con intervalos,
 *   para que vigile el proyecto continuamente y auto-mejore.
 *
 * AC (features/daemon-watch.feature):
 *   AC-1 daemonWatch(dir, {intervalMs, maxTicks}) corre daemonTick en bucle.
 *   AC-2 corre hasta maxTicks (testable) o infinito (CLI --watch).
 *   AC-3 devuelve los resultados de cada tick.
 *   AC-4 idempotente (cada tick es una pasada independiente).
 */
import { daemonTick, type DaemonResult } from './index'

/** rol: corre daemonTick en bucle con intervalos (AC-1..4). */
export async function daemonWatch(
  projectDir: string,
  opts: { intervalMs: number; maxTicks?: number },
): Promise<DaemonResult[]> {
  const results: DaemonResult[] = []
  const max = opts.maxTicks ?? Infinity
  for (let i = 0; i < max; i++) {
    results.push(await daemonTick(projectDir))
    if (i < max - 1) {
      await new Promise((r) => setTimeout(r, opts.intervalMs))
    }
  }
  return results
}
