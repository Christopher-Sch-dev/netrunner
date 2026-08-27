/**
 * rol: Daemon persistente de Netrunner (Jueces 1,2,3 — el "curator fantasma" de Rache Bartmoss).
 * Una pasada del daemon: syncIfNeeded (auto-sync del grafo) + lint (health-check)
 * + curator (auto-mejora con señal externa). El grafo se mantiene al día sin
 * invocar `init` manualmente.
 *
 * SPEC (Mandamiento 0):
 *   Como el motor Netrunner,
 *   quiero un daemon que vigile el proyecto y auto-sincronice el grafo,
 *   para que el grafo se mantenga al día sin invocar init manual.
 *
 * AC (features/daemon.feature):
 *   AC-1 daemonTick corre sync + lint + curator.
 *   AC-2 devuelve { synced, issues, actions }.
 *   AC-3 sin cambios → synced false, sin issues, sin acciones.
 *   AC-4 idempotente.
 */
import { syncIfNeeded } from '../context/sync'
import { lintSnapshot } from '../auto/lint'
import { curate } from '../auto/curator'
import { buildSnapshot } from '../context/snapshot'

/** Resultado de una pasada del daemon. */
export interface DaemonResult {
  synced: boolean
  issues: Array<{ type: string; message: string }>
  actions: Array<{ type: string; skill?: string; symbol?: string }>
}

/** rol: corre una pasada del daemon (AC-1..4). */
export async function daemonTick(projectDir: string): Promise<DaemonResult> {
  // 1. auto-sync del grafo (AC-1)
  const sync = await syncIfNeeded(projectDir)

  // 2. lint del snapshot (health-check)
  const snap = await buildSnapshot(projectDir)
  const lint = lintSnapshot(snap as never)

  // 3. curator (auto-mejora con señal externa) — sin observaciones → no-op
  const actions = curate([])

  return { synced: sync.synced, issues: lint.issues, actions }
}
