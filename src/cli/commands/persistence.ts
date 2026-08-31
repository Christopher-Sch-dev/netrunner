/**
 * rol: handlers de persistencia (W5.F5.2) — persist, rollback, snapshot, history.
 * Cada handler recibe el contexto (DI) y delega en emit/fail del router.
 */
import type { HandlerContext } from './types'

/** rol: persistir una decisión (persist slug). */
export async function persist(ctx: HandlerContext): Promise<void> {
  const { persistDecision } = await import('../../persist/index')
  const decision = ctx.args.join(' ') || 'decisión'
  ctx.emit(persistDecision(ctx.projectDir, decision, 'netrunner'), ctx.human)
  process.exit(0)
}

/** rol: rollback de snapshots (create/restore/list). */
export async function rollback(ctx: HandlerContext): Promise<void> {
  const { listSnapshots, createSnapshot, restoreSnapshot } = await import('../../rollback/index')
  if (ctx.args[0] === 'create') {
    ctx.emit(createSnapshot(ctx.projectDir), ctx.human)
  } else if (ctx.args[0] === 'restore') {
    const id = ctx.args[1]
    if (!id) {
      ctx.emit({ error: true, code: 'MISSING_REQUIRED', message: 'rollback restore <id> requires a snapshot id' }, ctx.human)
      process.exit(2)
    }
    restoreSnapshot(ctx.projectDir, id)
    ctx.emit({ restored: id }, ctx.human)
  } else {
    ctx.emit(listSnapshots(ctx.projectDir), ctx.human)
  }
  process.exit(0)
}

/** rol: snapshot del contexto (save/load/build). */
export async function snapshot(ctx: HandlerContext): Promise<void> {
  const { buildSnapshot, saveSnapshot, loadSnapshot } = await import('../../context/snapshot')
  if (ctx.args[0] === 'save') {
    const snap = await buildSnapshot(ctx.projectDir)
    const path = saveSnapshot(ctx.projectDir, snap)
    ctx.emit({ saved: path }, ctx.human)
  } else if (ctx.args[0] === 'load') {
    ctx.emit(loadSnapshot(ctx.projectDir), ctx.human)
  } else {
    ctx.emit(await buildSnapshot(ctx.projectDir), ctx.human)
  }
  process.exit(0)
}

/** rol: historial de operaciones del agente. */
export async function history(ctx: HandlerContext): Promise<void> {
  const { history } = await import('../../history/index')
  ctx.emit(history(ctx.projectDir), ctx.human)
  process.exit(0)
}
