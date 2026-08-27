#!/usr/bin/env node
/**
 * rol: Netrunner CLI (AC-4 dashboard, AC-6 deterministic ops, AC-14 agent-friendly).
 * Follows the ai-native-cli spec (JSON output by default, exit codes, --human).
 *
 *   netrunner                    → content-first dashboard (JSON)
 *   netrunner init <dir>         → indexes the project graph
 *   netrunner plan "<goal>"      → generates a plan from the context (dashboard)
 *   netrunner --mcp              → starts the MCP server over stdio
 *   netrunner --version / --help → self-description
 *
 * SPEC (Mandamiento 0):
 *   As an agent connecting to a Netrunner project,
 *   I want to invoke the engine via CLI with stable JSON output,
 *   so that I can operate the project deterministically and pipe-friendly.
 *
 * AC:
 *   AC-4 content-first dashboard (stack + capabilities + counts).
 *   AC-14 JSON output by default, exit 0/1/2, stderr for errors.
 */
import { existsSync } from 'node:fs'
import { detectStack } from './context/detect'
import { indexProject } from './context/graph'

/** rol: parses argv (flags --flag, --flag=val, --dir <path>). Returns {subcommand, flags, args}. */
function parseArgs(argv: string[]): { subcommand: string; flags: Record<string, string>; args: string[] } {
  const flags: Record<string, string> = {}
  const args: string[] = []
  let subcommand = ''
  // flags that consume the next argument as a value (--dir <path>)
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
          flags[name] = argv[++i] // consumes the next arg as a value
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

/** rol: tool actual (subcommand) para _meta.tool — fix juez: el agente debe saber qué tool respondió. */
let currentTool = ''

/** rol: prints stable JSON to stdout (agent). --human produces plain text. */
export function emit(data: unknown, human: boolean, tool = ''): void {
  if (human) {
    console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
  } else {
    // _meta: schema version + tool (validator #4 — the LLM knows what to expect)
    const withMeta = { _meta: { schemaVersion: '1.0', tool: tool || currentTool }, ...(data as Record<string, unknown>) }
    console.log(JSON.stringify(withMeta))
  }
}

/** rol: prints a structured error to stderr and exits with an exit code. */
function fail(code: string, message: string, suggestion: string, exitCode = 1): never {
  process.stderr.write(JSON.stringify({ error: true, code, message, suggestion }) + '\n')
  process.exit(exitCode)
}

/** rol: generates an actionable plan from the goal using the indexed graph (AC-1/2). */
async function generatePlan(goal: string, projectDir: string): Promise<{ goal: string; steps: Array<{ action: string; target: string }> }> {
  const { nodes } = await indexProject(projectDir, { incremental: true })
  const symbols = nodes.filter((n) => n.kind !== 'import').slice(0, 20)
  const files = new Set(nodes.map((n) => n.file)).size

  // deterministic plan (TOON): steps derived from context, no verbosity
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

/** rol: content-first project dashboard (AC-4). */
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

/** rol: binary entrypoint. */
export async function main(argv: string[]): Promise<never> {
  const { subcommand, flags, args } = parseArgs(argv)
  // naming cyberpunk (W3.D3.2): jack→init, quickhacks→ops, ice→guard
  const { resolveAlias } = await import('./naming/index')
  const resolved = subcommand ? resolveAlias(subcommand) : undefined
  // fix juez: _meta.tool debe reflejar el subcommand (el agente sabe qué tool respondió)
  currentTool = resolved ?? ''
  const human = flags.human === 'true' || flags.human === '1'
  // Bug cwd (auditor): --dir <path> takes precedence over process.cwd().
  // The agent may not be in the correct cwd → it would index the wrong directory.
  const projectDir = flags.dir ?? process.cwd()

  // fix juez de casos borde: --dir inexistente → error (no mentir reportando éxito)
  if (flags.dir && !existsSync(projectDir)) {
    fail('INVALID_DIR', `directorio no existe: '${projectDir}'`, 'usa un path válido con --dir', 2)
  }

  // fix juez hacker (#8): bloquear directorios de sistema en --dir (no filtrar estructura del OS)
  const FORBIDDEN_DIRS = ['/etc', '/usr', '/var', '/proc', '/sys', '/boot', '/bin', '/sbin', '/lib', '/lib64', '/root', '/dev']
  if (flags.dir && FORBIDDEN_DIRS.some((d) => projectDir === d || projectDir.startsWith(d + '/'))) {
    fail('FORBIDDEN_DIR', `directorio de sistema no operable: '${projectDir}'`, 'usa un directorio de proyecto (código), no del sistema', 2)
  }

  if (flags['version'] || subcommand === 'version') {
    emit({ name: 'netrunner', version: '0.3.1' }, human)
    process.exit(0)
  }

  if (flags['help'] || subcommand === 'help') {
    // if --help comes with a subcommand that is a tool, print its schema
    if (subcommand && subcommand !== 'help') {
      const { toolHelp } = await import('./discovery/index')
      const { buildNetrunnerRegistry } = await import('./core/registry-factory')
      const registry = buildNetrunnerRegistry()
      // maps subcommand → tool id (explore → graph.explore, etc.)
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
      commands: ['init', 'status', 'scan', 'map', 'depth', 'explore', 'plan', 'guard', 'persist', 'rollback', 'snapshot', 'policy', 'curate', 'lint', 'daemon', 'mesh', 'dump', 'install', 'plugin', '--mcp', '--acp', '--a2a'],
    }, human)
    process.exit(0)
  }

  if (flags['mcp'] || subcommand === 'mcp') {
    // --mcp starts the MCP server over stdio (does not respond JSON back).
    const { serveMCP } = await import('./transport/mcp-server')
    await serveMCP(projectDir)
    // NO process.exit(0) here: serveMCP keeps the process alive listening on stdin (Bug B).
  }

  if (flags['acp'] || subcommand === 'acp') {
    // --acp starts the ACP agent over stdio (ACP view, for IDEs like Zed).
    // serveACP already connects the stream (process.stdin/stdout) internally.
    const { serveACP } = await import('./harness/acp')
    serveACP(projectDir)
    await new Promise<void>(() => {}) // keeps the process alive
  }

  if (flags['a2a'] || subcommand === 'a2a') {
    // --a2a starts the A2A server over stdio (A2A v1.0 view, W4.E4.1).
    // Exposes the ToolRegistry as an A2A agent (Agent Card + SendMessage).
    const { serveA2A } = await import('./transport/a2a-server')
    await serveA2A(projectDir)
    // NO process.exit(0): serveA2A keeps the process alive listening on stdin.
  }

  switch (resolved ?? subcommand) {
    case 'mesh': {
      const { meshProjects } = await import('./mesh/index')
      const dirs = args.length > 0 ? args : [projectDir]
      emit(await meshProjects(dirs), human)
      process.exit(0)
    }
    case 'daemon': {
      const { daemonTick } = await import('./daemon/index')
      // --watch: daemon residente (corre en bucle con intervalos, W2.C2.2)
      if (flags['watch'] === 'true' || flags['watch'] === '1') {
        const { daemonWatch } = await import('./daemon/watch')
        const intervalMs = Number(args[0] ?? 5000)
        const results = await daemonWatch(projectDir, { intervalMs })
        emit({ watched: results.length, last: results[results.length - 1] }, human)
      } else {
        emit(await daemonTick(projectDir), human)
      }
      process.exit(0)
    }
    case 'lint': {
      const { lintSnapshot } = await import('./auto/lint')
      const { buildSnapshot } = await import('./context/snapshot')
      const snap = await buildSnapshot(projectDir)
      emit(lintSnapshot(snap as never), human)
      process.exit(0)
    }
    case 'dump': {
      const { dumpContract } = await import('./discovery/index')
      const { buildNetrunnerRegistry } = await import('./core/registry-factory')
      emit(dumpContract(buildNetrunnerRegistry()), human)
      process.exit(0)
    }
    case 'map': {
      const { exportMap } = await import('./map/index')
      const { syncIfNeeded } = await import('./context/sync')
      await syncIfNeeded(projectDir) // auto-sync: the graph keeps itself up to date (Fase 3)
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
      const { canonStale } = await import('./canon/stale')
      const snap = await buildSnapshot(projectDir)
      if (flags['docs'] === 'true' || flags['docs'] === '1') {
        await generateDocs(projectDir)
      }
      // canon-vivo señal (AC-4): el agente ve si el canon está desactualizado (edita él, no el sistema)
      const out = { ...snap, canonStale: canonStale(projectDir) }
      emit(out, human)
      process.exit(0)
    }
    case 'ops':
    case 'op': {
      // vision (AC-6): operar el proyecto (test/build/lint) — el control plane
      const { runOp } = await import('./tools/ops')
      const { logOperation } = await import('./history/index')
      const { emitEvent } = await import('./context/events')
      const kind = args[0] ?? 'test'
      const timeout = Number(args[1] ?? 30000)
      emitEvent(projectDir, { type: 'op/start', tool: `op.${kind}` })
      const r = await runOp(kind, projectDir, timeout)
      emitEvent(projectDir, { type: r.ok ? 'op/result' : 'op/error', tool: `op.${kind}`, ok: r.ok })
      logOperation(projectDir, `ops ${kind}`, r.ok ? 'ok' : 'fail')
      emit(r, human)
      process.exit(0)
    }
    case 'quickhacks': {
      // vision (W3.D3.3): quickhacks con costo/cooldown (mina #8)
      const { listQuickhacks } = await import('./quickhacks/index')
      emit({ quickhacks: listQuickhacks() }, human)
      process.exit(0)
    }
    case 'deck': {
      // vision (W3.D3.2): estado del deck (quickhacks + daemons + canon pendiente)
      const { deckState } = await import('./naming/index')
      const { canonStale } = await import('./canon/stale')
      const { history } = await import('./history/index')
      const h = history(projectDir)
      const state = deckState({
        quickhacks: ['test', 'build', 'lint'],
        daemons: ['curator', 'sync'],
        canonStale: canonStale(projectDir),
      })
      emit({ ...state, lastOps: h.operations.slice(0, 5) }, human)
      process.exit(0)
    }
    case 'breach': {
      // vision (W3.D3.1): descifrar un repo desconocido (Breach Protocol)
      const { breach } = await import('./breach/index')
      emit(await breach(projectDir), human)
      process.exit(0)
    }
    case 'doctor': {
      // self-check del deck (fix juez de producto: lint invisible)
      const { doctor } = await import('./doctor/index')
      emit(await doctor(projectDir), human)
      process.exit(0)
    }
    case 'resume': {
      // vision (W1): el recuerdo que se re-adhiere al reconectar (virus persiste tras Jack-Out)
      const { resume } = await import('./resume/index')
      emit(await resume(projectDir), human)
      process.exit(0)
    }
    case 'history': {
      const { history } = await import('./history/index')
      emit(history(projectDir), human)
      process.exit(0)
    }
    case 'init': {
      const dir = args[0] ?? projectDir
      // jack-remote (W5.F5.1): si el arg es owner/repo → clonar repo GitHub remoto
      if (args[0] && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(args[0])) {
        const { jackRemote } = await import('./jack-remote/index')
        const result = await jackRemote(args[0], projectDir)
        emit({ jacked: result.dir, counts: result.counts }, human)
        process.exit(0)
      }
      // vision (AC-1): init indexa Y genera el conectable layer (mcp.json + SKILL.md + AGENTS.md)
      const { initProject } = await import('./init')
      const { logOperation } = await import('./history/index')
      const result = await initProject(dir)
      logOperation(projectDir, 'init')
      emit({ indexed: dir, counts: result.counts, written: result.written }, human)
      process.exit(0)
    }
    case 'plan': {
      const goal = args.join(' ').trim()
      if (!goal) fail('MISSING_REQUIRED', 'plan requiere un goal', 'netrunner plan "<goal>"', 2)
      // plan real basado en el grafo (W1.B1.3 — fix juez: no stub genérico)
      const { generatePlan } = await import('./plan/index')
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
    case 'uninstall': {
      const { uninstall } = await import('./install')
      const target = args[0] ?? 'mcp'
      try {
        const result = uninstall(target, projectDir)
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
      emit({ help: 'netrunner — plug any project into any agent', commands: ['init', 'status', 'scan', 'map', 'depth', 'explore', 'plan', 'guard', 'persist', 'rollback', 'snapshot', 'policy', 'curate', 'lint', 'daemon', 'mesh', 'dump', 'install', 'plugin', '--mcp', '--acp', '--a2a', '--version'] }, true)
      process.exit(0)
    }
    default: {
      // no subcommand → dashboard (AC-4). Unknown subcommand → error (fix juez de casos borde).
      if (subcommand && !flags['help'] && subcommand !== 'version') {
        fail('UNKNOWN_COMMAND', `comando no reconocido: '${subcommand}'`, 'usa: netrunner --help para la lista', 2)
      }
      emit(await dashboard(projectDir), human)
      process.exit(0)
    }
  }
}

// Runs only if it is the direct entrypoint (not imported in tests).
if (import.meta.main) {
  main(process.argv.slice(2)).catch((e) => fail('INTERNAL', String(e?.message ?? e), 'revisa los logs', 1))
}
