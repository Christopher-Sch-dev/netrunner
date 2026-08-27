/**
 * rol: handlers de contexto/grafo (W5.F5.2) — status, map, depth, scan, explore,
 * plan, init, lint, dump, curate. Cada handler recibe el contexto (DI).
 */
import type { HandlerContext } from './types'

/** rol: sticky note vivo del proyecto (AC-4) + canon-vivo señal. */
export async function status(ctx: HandlerContext): Promise<void> {
  const { buildSnapshot } = await import('../../context/snapshot')
  const { generateDocs } = await import('../../generate/index')
  const { canonStale } = await import('../../canon/stale')
  const snap = await buildSnapshot(ctx.projectDir)
  if (ctx.flags['docs'] === 'true' || ctx.flags['docs'] === '1') {
    await generateDocs(ctx.projectDir)
  }
  const out = { ...snap, canonStale: canonStale(ctx.projectDir) }
  ctx.emit(out, ctx.human)
  process.exit(0)
}

/** rol: exporta el mapa del grafo (auto-sync Fase 3). */
export async function map(ctx: HandlerContext): Promise<void> {
  const { exportMap } = await import('../../map/index')
  const { syncIfNeeded } = await import('../../context/sync')
  await syncIfNeeded(ctx.projectDir)
  ctx.emit(exportMap(ctx.projectDir), ctx.human)
  process.exit(0)
}

/** rol: query de profundidad de un símbolo. */
export async function depth(ctx: HandlerContext): Promise<void> {
  const { depthQuery } = await import('../../depth/index')
  const symbol = ctx.args[0] ?? ''
  const level = Number(ctx.args[1] ?? 0)
  ctx.emit(await depthQuery(symbol, level, ctx.projectDir), ctx.human)
  process.exit(0)
}

/** rol: shortest-path entre dos símbolos (gap Graphify: graphify path A B). */
export async function path(ctx: HandlerContext): Promise<void> {
  const { shortestPath } = await import('../../path/index')
  const from = ctx.args[0]
  const to = ctx.args[1]
  if (!from || !to) {
    ctx.fail('MISSING_REQUIRED', 'path requiere dos símbolos', 'netrunner path <from> <to>', 2)
  }
  ctx.emit({ from, to, path: await shortestPath(ctx.projectDir, from, to) }, ctx.human)
  process.exit(0)
}

/** rol: god nodes — nodos más conectados del grafo (gap Graphify: god nodes). */
export async function godNodes(ctx: HandlerContext): Promise<void> {
  const { godNodes } = await import('../../god-nodes/index')
  ctx.emit({ godNodes: await godNodes(ctx.projectDir) }, ctx.human)
  process.exit(0)
}

/** rol: escaneo del proyecto. */
export async function scan(ctx: HandlerContext): Promise<void> {
  const { scanProject } = await import('../../scan/index')
  ctx.emit(await scanProject(ctx.projectDir), ctx.human)
  process.exit(0)
}

/** rol: explora un símbolo del grafo (auto-indexa si stale). */
export async function explore(ctx: HandlerContext): Promise<void> {
  const { explore } = await import('../../context/queries')
  const name = ctx.args[0]
  if (!name) ctx.fail('MISSING_REQUIRED', 'explore requiere un nombre', 'netrunner explore <sym>', 2)
  const r = await explore(name, ctx.projectDir)
  ctx.emit(r, ctx.human)
  process.exit(0)
}

/** rol: plan real basado en el grafo (W1.B1.3). */
export async function plan(ctx: HandlerContext): Promise<void> {
  const goal = ctx.args.join(' ').trim()
  if (!goal) ctx.fail('MISSING_REQUIRED', 'plan requiere un goal', 'netrunner plan "<goal>"', 2)
  const { generatePlan } = await import('../../plan/index')
  ctx.emit({ plan: await generatePlan(goal, ctx.projectDir) }, ctx.human)
  process.exit(0)
}

/** rol: init indexa Y genera el conectable layer (AC-1); jack-remote clona GitHub (W5.F5.1). */
export async function init(ctx: HandlerContext): Promise<void> {
  const dir = ctx.args[0] ?? ctx.projectDir
  if (ctx.args[0] && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(ctx.args[0])) {
    const { jackRemote } = await import('../../jack-remote/index')
    const result = await jackRemote(ctx.args[0], ctx.projectDir)
    ctx.emit({ jacked: result.dir, counts: result.counts }, ctx.human)
    process.exit(0)
  }
  const { initProject } = await import('../../init')
  const { logOperation } = await import('../../history/index')
  const result = await initProject(dir)
  logOperation(ctx.projectDir, 'init')
  ctx.emit({ indexed: dir, counts: result.counts, written: result.written }, ctx.human)
  process.exit(0)
}

/** rol: lint del snapshot (auto/lint). */
export async function lint(ctx: HandlerContext): Promise<void> {
  const { lintSnapshot } = await import('../../auto/lint')
  const { buildSnapshot } = await import('../../context/snapshot')
  const snap = await buildSnapshot(ctx.projectDir)
  ctx.emit(lintSnapshot(snap as never), ctx.human)
  process.exit(0)
}

/** rol: dump del contrato del registry (discovery). */
export async function dump(ctx: HandlerContext): Promise<void> {
  const { dumpContract } = await import('../../discovery/index')
  const { buildNetrunnerRegistry } = await import('../../core/registry-factory')
  ctx.emit(dumpContract(buildNetrunnerRegistry()), ctx.human)
  process.exit(0)
}

/** rol: curator de observaciones (auto/curator). */
export async function curate(ctx: HandlerContext): Promise<void> {
  const { curate } = await import('../../auto/curator')
  const obs = ctx.args.length ? JSON.parse(ctx.args.join(' ')) : []
  ctx.emit({ actions: curate(obs) }, ctx.human)
  process.exit(0)
}
