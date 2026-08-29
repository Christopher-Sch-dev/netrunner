/**
 * rol: handlers de sistema (W5.F5.2) — version, help, mcp, acp, a2a, resume, dashboard.
 * Cada handler recibe el contexto (DI) y delega en emit/fail del router.
 */
import type { HandlerContext } from './types'

/** rol: --version / version. */
export async function version(ctx: HandlerContext): Promise<void> {
  ctx.emit({ name: 'netrunner', version: '0.7.7' }, ctx.human)
  process.exit(0)
}

/** rol: --help / help (con schema de tool si viene con subcomando). */
export async function help(ctx: HandlerContext): Promise<void> {
  if (ctx.subcommand && ctx.subcommand !== 'help') {
    const { toolHelp } = await import('../../discovery/index')
    const { buildNetrunnerRegistry } = await import('../../core/registry-factory')
    const registry = buildNetrunnerRegistry()
    const toolId = registry.listIds().find((id) => id.endsWith(`.${ctx.subcommand}`))
    if (toolId) {
      ctx.emit(toolHelp(registry, toolId), ctx.human)
      process.exit(0)
    }
  }
  ctx.emit({
    name: 'netrunner',
    version: '0.7.7',
    usage: 'netrunner <cmd> [args] [--dir <path>] [--human]',
    commands: ['init', 'status', 'scan', 'map', 'depth', 'explore', 'path', 'god-nodes', 'graph-report', 'plan', 'guard', 'persist', 'rollback', 'snapshot', 'policy', 'curate', 'lint', 'daemon', 'mesh', 'dump', 'install', 'uninstall', 'plugin', 'breach', 'deck', 'mode', 'quickhacks', 'resume', 'sleeve', 'doctor', 'history', 'mcp-orchestrate', '--mcp', '--acp', '--a2a'],
  }, ctx.human)
  process.exit(0)
}

/** rol: --mcp inicia el servidor MCP sobre stdio (no responde JSON; mantiene vivo). */
export async function mcp(ctx: HandlerContext): Promise<void> {
  const { serveMCP } = await import('../../transport/mcp-server')
  await serveMCP(ctx.projectDir)
}

/** rol: --acp inicia el agente ACP sobre stdio (mantiene vivo). */
export async function acp(ctx: HandlerContext): Promise<void> {
  const { serveACP } = await import('../../harness/acp')
  serveACP(ctx.projectDir)
  await new Promise<void>(() => {})
}

/** rol: --a2a inicia el servidor A2A sobre stdio (mantiene vivo). */
export async function a2a(ctx: HandlerContext): Promise<void> {
  const { serveA2A } = await import('../../transport/a2a-server')
  await serveA2A(ctx.projectDir)
}

/** rol: el recuerdo que se re-adhiere al reconectar (W1). */
export async function resume(ctx: HandlerContext): Promise<void> {
  const { resume } = await import('../../resume/index')
  const { pendingSignals, markSignalsRead } = await import('../../hooks/index')
  const state = await resume(ctx.projectDir)
  // hook (Wave B): el agente ve las señales pendientes al reconectar
  const signals = pendingSignals(ctx.projectDir)
  // fix auditor: el agente las vio → marcar como leídas (cierra el ciclo de memoria viva)
  markSignalsRead(ctx.projectDir)
  ctx.emit({ ...state, signals }, ctx.human)
  process.exit(0)
}

/** rol: net sleeve — exporta/importa el deck portable (W6, Construct). */
export async function sleeve(ctx: HandlerContext): Promise<void> {
  const { exportSleeve, importSleeve } = await import('../../sleeve/index')
  const action = ctx.args[0] ?? 'export'
  if (action === 'import' && ctx.args[1]) {
    // import desde un archivo JSON (fix auditor M3 + implante gap 3: permitir import de
    // cualquier path — portabilidad cross-proyecto — PERO validar que sea un sleeve válido)
    const { readFileSync, existsSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const importPath = resolve(ctx.args[1])
    if (!existsSync(importPath)) {
      ctx.emit({ imported: false, error: `archivo no existe: ${importPath}` }, ctx.human)
      process.exit(1)
    }
    let sleeve: unknown
    try {
      sleeve = JSON.parse(readFileSync(importPath, 'utf8'))
    } catch {
      ctx.emit({ imported: false, error: 'el archivo no es un sleeve JSON válido' }, ctx.human)
      process.exit(1)
    }
    // validar estructura de sleeve (no leer archivos arbitrarios sin propósito)
    const s = sleeve as { decisions?: unknown; history?: unknown; snapshot?: unknown }
    if (!s.decisions && !s.history && !s.snapshot) {
      ctx.emit({ imported: false, error: 'el archivo no tiene estructura de sleeve (decisions/history/snapshot)' }, ctx.human)
      process.exit(1)
    }
    importSleeve(ctx.projectDir, sleeve as Parameters<typeof importSleeve>[1])
    ctx.emit({ imported: true }, ctx.human)
  } else {
    // fix auditor (issue #3): export escribe el archivo .netrunner/sleeve.json (portable)
    const { writeFileSync, mkdirSync } = await import('node:fs')
    const { join } = await import('node:path')
    const sleeveData = exportSleeve(ctx.projectDir)
    const sleevePath = join(ctx.projectDir, '.netrunner', 'sleeve.json')
    mkdirSync(join(ctx.projectDir, '.netrunner'), { recursive: true })
    writeFileSync(sleevePath, JSON.stringify(sleeveData, null, 2))
    ctx.emit({ ...sleeveData, exportedTo: sleevePath }, ctx.human)
  }
  process.exit(0)
}

/** rol: content-first project dashboard (AC-4). */
export async function dashboard(ctx: HandlerContext): Promise<void> {
  const { detectStack } = await import('../../context/detect')
  const { indexProject } = await import('../../context/graph')
  const stack = await detectStack(ctx.projectDir)
  const { nodes, edges } = await indexProject(ctx.projectDir, { incremental: true })
  const symbols = nodes.filter((n) => n.kind !== 'import').length
  const files = new Set(nodes.map((n) => n.file)).size
  ctx.emit({
    project: ctx.projectDir,
    stack,
    capabilities: ['graph', 'ops'],
    counts: { symbols, files, edges: edges.length },
    nextSteps: ['netrunner explore <sym>', 'netrunner install'],
  }, ctx.human)
  process.exit(0)
}
