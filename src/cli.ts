#!/usr/bin/env node
/**
 * rol: CLI de Netrunner (AC-4 dashboard, AC-6 ops deterministas, AC-14 agent-friendly).
 * Sigue la spec ai-native-cli (JSON output por defecto, exit codes, --human).
 *
 *   netrunner                    → dashboard content-first (JSON)
 *   netrunner init <dir>         → indexa el grafo del proyecto
 *   netrunner plan "<goal>"      → genera plan desde el contexto (dashboard)
 *   netrunner --mcp              → arranca el servidor MCP por stdio
 *   netrunner --version / --help → self-description
 *
 * SPEC (Mandamiento 0):
 *   Como un agente que se conecta a un proyecto Netrunner,
 *   quiero invocar el motor por CLI con salida JSON estable,
 *   para operar el proyecto de forma determinista y pipe-friendly.
 *
 * AC:
 *   AC-4 dashboard content-first (stack + capabilities + counts).
 *   AC-14 output JSON por defecto, exit 0/1/2, stderr para errores.
 */
import { detectStack } from './context/detect'
import { indexProject } from './context/graph'

/** rol: parsea argv (flags --flag, --flag=val, --dir <path>). Devuelve {subcommand, flags, args}. */
function parseArgs(argv: string[]): { subcommand: string; flags: Record<string, string>; args: string[] } {
  const flags: Record<string, string> = {}
  const args: string[] = []
  let subcommand = ''
  // flags que consumen el siguiente argumento como valor (--dir <path>)
  const valueFlags = new Set(['dir'])
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq > -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1)
      } else {
        const name = a.slice(2)
        if (valueFlags.has(name) && i + 1 < argv.length) {
          flags[name] = argv[++i] // consume el siguiente arg como valor
        } else {
          flags[name] = 'true'
        }
      }
    } else if (!subcommand) {
      subcommand = a
    } else {
      args.push(a)
    }
  }
  return { subcommand, flags, args }
}

/** rol: imprime JSON estable a stdout (agente). --human produce texto simple. */
function emit(data: unknown, human: boolean): void {
  if (human) {
    console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
  } else {
    console.log(JSON.stringify(data))
  }
}

/** rol: imprime error estructurado a stderr y sale con exit code. */
function fail(code: string, message: string, suggestion: string, exitCode = 1): never {
  process.stderr.write(JSON.stringify({ error: true, code, message, suggestion }) + '\n')
  process.exit(exitCode)
}

/** rol: genera un plan accionable del goal usando el grafo indexado (AC-1/2). */
async function generatePlan(goal: string, projectDir: string): Promise<{ goal: string; steps: Array<{ action: string; target: string }> }> {
  const { nodes } = await indexProject(projectDir, { incremental: true })
  const symbols = nodes.filter((n) => n.kind !== 'import').slice(0, 20)
  const files = new Set(nodes.map((n) => n.file)).size

  // plan determinista (TOON): pasos derivados del contexto, sin verbosidad
  const steps: Array<{ action: string; target: string }> = []
  if (symbols.length > 0) {
    steps.push({ action: 'explore', target: symbols[0].name })
    steps.push({ action: 'map-deps', target: `${files} archivos, ${symbols.length} símbolos indexados` })
  } else {
    steps.push({ action: 'index', target: projectDir })
  }
  steps.push({ action: 'verify', target: goal })
  return { goal, steps }
}

/** rol: dashboard content-first del proyecto (AC-4). */
async function dashboard(projectDir: string): Promise<Record<string, unknown>> {
  const stack = await detectStack(projectDir)
  const { nodes, edges } = await indexProject(projectDir, { incremental: true })
  const symbols = nodes.filter((n) => n.kind !== 'import').length
  const files = new Set(nodes.map((n) => n.file)).size
  return {
    project: projectDir,
    stack,
    capabilities: ['graph', 'ops'],
    counts: { symbols: symbols, files, edges: edges.length },
    nextSteps: ['netrunner explore <sym>', 'netrunner install'],
  }
}

/** rol: entrypoint del binario. */
export async function main(argv: string[]): Promise<never> {
  const { subcommand, flags, args } = parseArgs(argv)
  const human = flags.human === 'true' || flags.human === '1'
  // Bug cwd (auditor): --dir <path> tiene precedencia sobre process.cwd().
  // El agente puede no estar en el cwd correcto → indexa el directorio equivocado.
  const projectDir = flags.dir ?? process.cwd()

  if (flags['version'] || subcommand === 'version') {
    emit({ name: 'netrunner', version: '0.3.1' }, human)
    process.exit(0)
  }

  if (flags['help'] || subcommand === 'help') {
    // si --help viene con un subcommand que es una tool, imprime su schema
    if (subcommand && subcommand !== 'help') {
      const { toolHelp } = await import('./discovery/index')
      const { buildNetrunnerRegistry } = await import('./core/registry-factory')
      const registry = buildNetrunnerRegistry()
      // mapea subcommand → id de tool (explore → graph.explore, etc.)
      const toolId = registry.listIds().find((id) => id.endsWith(`.${subcommand}`))
      if (toolId) {
        emit(toolHelp(registry, toolId), human)
        process.exit(0)
      }
    }
    emit({
      name: 'netrunner',
      version: '0.3.1',
      usage: 'netrunner <cmd> [args] [--dir <path>] [--human]',
      commands: ['init', 'status', 'scan', 'map', 'depth', 'explore', 'plan', 'guard', 'persist', 'rollback', 'install', 'plugin', 'dump', '--mcp'],
    }, human)
    process.exit(0)
  }

  if (flags['mcp'] || subcommand === 'mcp') {
    // --mcp arranca el servidor MCP por stdio (no responde JSON de vuelta).
    const { serveMCP } = await import('./transport/mcp-server')
    await serveMCP(projectDir)
    // NO process.exit(0) aquí: serveMCP mantiene el proceso vivo escuchando stdin (Bug B).
  }

  if (flags['acp'] || subcommand === 'acp') {
    // --acp arranca el agente ACP por stdio (vista ACP, para IDEs como Zed).
    // serveACP ya conecta el stream (process.stdin/stdout) internamente.
    const { serveACP } = await import('./harness/acp')
    serveACP(projectDir)
    await new Promise<void>(() => {}) // mantiene el proceso vivo
  }

  switch (subcommand) {
    case 'dump': {
      const { dumpContract } = await import('./discovery/index')
      const { buildNetrunnerRegistry } = await import('./core/registry-factory')
      emit(dumpContract(buildNetrunnerRegistry()), human)
      process.exit(0)
    }
    case 'map': {
      const { exportMap } = await import('./map/index')
      const { syncIfNeeded } = await import('./context/sync')
      await syncIfNeeded(projectDir) // auto-sync: el grafo se mantiene solo (Fase 3)
      emit(exportMap(projectDir), human)
      process.exit(0)
    }
    case 'depth': {
      const { depthQuery } = await import('./depth/index')
      const symbol = args[0] ?? ''
      const level = Number(args[1] ?? 0)
      emit(await depthQuery(symbol, level, projectDir), human)
      process.exit(0)
    }
    case 'scan': {
      const { scanProject } = await import('./scan/index')
      emit(await scanProject(projectDir), human)
      process.exit(0)
    }
    case 'guard': {
      const { guardCheck } = await import('./guard/index')
      emit(guardCheck(projectDir), human)
      process.exit(0)
    }
    case 'persist': {
      const { persistDecision } = await import('./persist/index')
      const decision = args.join(' ') || 'decisión'
      emit(persistDecision(projectDir, decision, 'netrunner'), human)
      process.exit(0)
    }
    case 'rollback': {
      const { listSnapshots, createSnapshot, restoreSnapshot } = await import('./rollback/index')
      if (args[0] === 'create') {
        emit(createSnapshot(projectDir), human)
      } else if (args[0] === 'restore') {
        const id = args[1]
        if (!id) {
          emit({ error: true, code: 'MISSING_REQUIRED', message: 'rollback restore <id> requiere un id de snapshot' }, human)
          process.exit(2)
        }
        restoreSnapshot(projectDir, id)
        emit({ restored: id }, human)
      } else {
        emit(listSnapshots(projectDir), human)
      }
      process.exit(0)
    }
    case 'snapshot': {
      const { buildSnapshot, saveSnapshot, loadSnapshot } = await import('./context/snapshot')
      if (args[0] === 'save') {
        const snap = await buildSnapshot(projectDir)
        const path = saveSnapshot(projectDir, snap)
        emit({ saved: path }, human)
      } else if (args[0] === 'load') {
        emit(loadSnapshot(projectDir), human)
      } else {
        emit(await buildSnapshot(projectDir), human)
      }
      process.exit(0)
    }
    case 'policy': {
      const { evaluatePolicy } = await import('./policy/index')
      const intent = args[0] ?? 'explore'
      const readOnly = flags['readonly'] === 'true' || flags['readonly'] === '1'
      const approval = flags['approval'] === 'true' || flags['approval'] === '1'
      emit({ intent, decision: evaluatePolicy(intent as never, { readOnly, approval }) }, human)
      process.exit(0)
    }
    case 'curate': {
      const { curate } = await import('./auto/curator')
      const obs = args.length ? JSON.parse(args.join(' ')) : []
      emit({ actions: curate(obs) }, human)
      process.exit(0)
    }
    case 'status': {
      const { buildSnapshot } = await import('./context/snapshot')
      const { generateDocs } = await import('./generate/index')
      const snap = await buildSnapshot(projectDir)
      if (flags['docs'] === 'true' || flags['docs'] === '1') {
        await generateDocs(projectDir)
      }
      emit(snap, human)
      process.exit(0)
    }
    case 'init': {
      const dir = args[0] ?? projectDir
      const { nodes, edges } = await indexProject(dir)
      // output consistente: counts anidados (no colisiona con map que usa nodes:[...])
      emit({ indexed: dir, counts: { nodes: nodes.length, edges: edges.length } }, human)
      process.exit(0)
    }
    case 'plan': {
      const goal = args.join(' ').trim()
      if (!goal) fail('MISSING_REQUIRED', 'plan requiere un goal', 'netrunner plan "<goal>"', 2)
      // TOON: devuelve SOLO { goal, steps } (sin campo context verboso) — AC-3
      emit({ plan: await generatePlan(goal, projectDir) }, human)
      process.exit(0)
    }
    case 'plugin': {
      const { generatePlugin } = await import('./plugin/generate')
      const name = args[0] ?? 'netrunner'
      const version = args[1] ?? '1.0.0'
      const result = generatePlugin(name, version, projectDir)
      emit(result, human)
      process.exit(0)
    }
    case 'install': {
      const { install } = await import('./install')
      const target = args[0] ?? 'mcp'
      try {
        const result = install(target, projectDir)
        emit(result, human)
      } catch (e) {
        fail('UNKNOWN_TARGET', String((e as Error).message), 'usa: mcp | opencode | claude | cursor', 2)
      }
      process.exit(0)
    }
    case 'explore': {
      const { explore } = await import('./context/queries')
      const name = args[0]
      if (!name) fail('MISSING_REQUIRED', 'explore requiere un nombre', 'netrunner explore <sym>', 2)
      const r = await explore(name, projectDir)
      emit(r, human)
      process.exit(0)
    }
    case '--help':
    case 'help': {
      emit({ help: 'netrunner — plug any project into any agent', commands: ['init', 'plan', 'explore', '--mcp', '--version'] }, true)
      process.exit(0)
    }
    default: {
      // sin subcomando → dashboard
      emit(await dashboard(projectDir), human)
      process.exit(0)
    }
  }
}

// Ejecuta solo si es el entrypoint directo (no importado en tests).
if (import.meta.main) {
  main(process.argv.slice(2)).catch((e) => fail('INTERNAL', String(e?.message ?? e), 'revisa los logs', 1))
}
