/**
 * rol: handlers del control plane (W5.F5.2) — ops, quickhacks, deck, doctor, daemon.
 * Cada handler recibe el contexto (DI) y delega en emit/fail del router.
 */
import type { HandlerContext } from './types'

/** rol: operar el proyecto (test/build/lint) — el control plane (AC-6). */
export async function ops(ctx: HandlerContext): Promise<void> {
  const { runOp } = await import('../../tools/ops')
  const { logOperation } = await import('../../history/index')
  const { emitEvent } = await import('../../context/events')
  const { recordLatency } = await import('../../metrics/index')
  const kind = ctx.args[0] ?? 'test'
  const timeout = Number(ctx.args[1] ?? 30000)
  const start = Date.now()
  emitEvent(ctx.projectDir, { type: 'op/start', tool: `op.${kind}` })
  const r = await runOp(kind, ctx.projectDir, timeout)
  recordLatency(ctx.projectDir, `op.${kind}`, Date.now() - start) // m4-metrics (W5.F5.3)
  emitEvent(ctx.projectDir, { type: r.ok ? 'op/result' : 'op/error', tool: `op.${kind}`, ok: r.ok })
  logOperation(ctx.projectDir, `ops ${kind}`, r.ok ? 'ok' : 'fail')
  ctx.emit(r, ctx.human)
  process.exit(0)
}

/** rol: quickhacks con costo/cooldown (W3.D3.3, mina #8). */
export async function quickhacks(ctx: HandlerContext): Promise<void> {
  const { listQuickhacks } = await import('../../quickhacks/index')
  ctx.emit({ quickhacks: listQuickhacks() }, ctx.human)
  process.exit(0)
}

/** rol: estado del deck (quickhacks + daemons + canon pendiente, W3.D3.2). */
export async function deck(ctx: HandlerContext): Promise<void> {
  const { deckState } = await import('../../naming/index')
  const { canonStale } = await import('../../canon/stale')
  const { history } = await import('../../history/index')
  const { detectStack } = await import('../../context/detect')
  const { disclosureFor } = await import('../../disclosure/index')
  const h = history(ctx.projectDir)
  const stack = await detectStack(ctx.projectDir)
  const state = deckState({
    quickhacks: ['test', 'build', 'lint'],
    daemons: ['curator', 'sync'],
    canonStale: canonStale(ctx.projectDir),
  })
  // progressive disclosure (W6): expone las tools del framework detectado
  const tools = disclosureFor({ language: stack.language, framework: stack.framework })
  ctx.emit({ ...state, tools, lastOps: h.operations.slice(0, 5) }, ctx.human)
  process.exit(0)
}

/** rol: self-check del deck (fix juez de producto: lint invisible). */
export async function doctor(ctx: HandlerContext): Promise<void> {
  const { doctor } = await import('../../doctor/index')
  ctx.emit(await doctor(ctx.projectDir), ctx.human)
  process.exit(0)
}

/** rol: net mode — el modo del deck (W6, Wintermute/Neuromancer). */
export async function mode(ctx: HandlerContext): Promise<void> {
  const { netMode } = await import('../../net-mode/index')
  const profile = ctx.args[0] ?? 'explore'
  ctx.emit({ profile, tools: netMode(profile) }, ctx.human)
  process.exit(0)
}

/** rol: daemon residente (--watch) o tick único (W2.C2.2). */
export async function daemon(ctx: HandlerContext): Promise<void> {
  const { daemonTick } = await import('../../daemon/index')
  if (ctx.flags['watch'] === 'true' || ctx.flags['watch'] === '1') {
    const { daemonWatch } = await import('../../daemon/watch')
    const intervalMs = Number(ctx.args[0] ?? 5000)
    const results = await daemonWatch(ctx.projectDir, { intervalMs })
    ctx.emit({ watched: results.length, last: results[results.length - 1] }, ctx.human)
  } else {
    ctx.emit(await daemonTick(ctx.projectDir), ctx.human)
  }
  process.exit(0)
}
