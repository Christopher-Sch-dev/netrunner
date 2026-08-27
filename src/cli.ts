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

/** rol: parsea argv (flags --flag, --flag=val). Devuelve {subcommand, flags, args}. */
function parseArgs(argv: string[]): { subcommand: string; flags: Record<string, string>; args: string[] } {
  const flags: Record<string, string> = {}
  const args: string[] = []
  let subcommand = ''
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq > -1) flags[a.slice(2, eq)] = a.slice(eq + 1)
      else flags[a.slice(2)] = 'true'
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
  const projectDir = process.cwd()

  if (flags['version'] || subcommand === 'version') {
    emit({ name: 'netrunner', version: '0.1.0' }, human)
    process.exit(0)
  }

  if (flags['mcp'] || subcommand === 'mcp') {
    // --mcp arranca el servidor MCP por stdio (no responde JSON de vuelta).
    const { serveMCP } = await import('./transport/mcp-server')
    await serveMCP(projectDir)
    // NO process.exit(0) aquí: serveMCP mantiene el proceso vivo escuchando stdin (Bug B).
  }

  switch (subcommand) {
    case 'init': {
      const dir = args[0] ?? projectDir
      const { nodes, edges } = await indexProject(dir)
      emit({ indexed: dir, nodes: nodes.length, edges: edges.length }, human)
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
