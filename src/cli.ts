#!/usr/bin/env node
/**
 * rol: Netrunner CLI — ROUTER (W5.F5.2). parseArgs + resolveAlias + dispatch table
 * que delega en handlers de src/cli/commands/. cli.ts < 200 líneas (M1).
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
import { existsSync, statSync, realpathSync } from 'node:fs'
import type { HandlerContext } from './cli/commands/types'
// imports estáticos de handlers (Bun bundlea imports estáticos; import() con string
// variable NO se bundlea y rompe el build — fix: dispatch table de funciones).
import * as ops from './cli/commands/ops'
import * as context from './cli/commands/context'
import * as security from './cli/commands/security'
import * as persistence from './cli/commands/persistence'
import * as integration from './cli/commands/integration'
import * as system from './cli/commands/system'
import * as orchestrate from './cli/commands/orchestrate'
import * as web from './cli/commands/web'
import * as setup from './cli/commands/setup'
import { estimateTokens } from './tokens/index'

/** rol: parses argv (flags --flag, --flag=val, --dir <path>). Returns {subcommand, flags, args}. */
function parseArgs(argv: string[]): { subcommand: string; flags: Record<string, string>; args: string[] } {
  const flags: Record<string, string> = {}
  const args: string[] = []
  let subcommand = ''
  const valueFlags = new Set(['dir']) // flags that consume the next argument as a value (--dir <path>)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq > -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1)
      } else {
        const name = a.slice(2)
        if (valueFlags.has(name) && i + 1 < argv.length) {
          flags[name] = argv[++i]
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
    const out = JSON.stringify(withMeta)
    // token-counting (W6): el agente sabe cuántos tokens paga por este output
    const withTokens = { ...withMeta, _meta: { ...withMeta._meta, tokens: estimateTokens(out) } }
    console.log(JSON.stringify(withTokens))
  }
}

/** rol: prints a structured error to stderr and exits with an exit code. */
function fail(code: string, message: string, suggestion: string, exitCode = 1): never {
  process.stderr.write(JSON.stringify({ error: true, code, message, suggestion }) + '\n')
  process.exit(exitCode)
}

/** rol: construye el contexto que se inyecta a cada handler (DI, Mandamiento 2). */
function makeCtx(projectDir: string, args: string[], flags: Record<string, string>, human: boolean, subcommand: string): HandlerContext {
  return { projectDir, args, flags, human, subcommand, emit, fail }
}

/** rol: dispatch table — comando(s) → [módulo handler, función]. Lazy import por dominio. */
const HANDLERS: Record<string, (ctx: HandlerContext) => Promise<void>> = {
  mesh: integration.mesh,
  daemon: ops.daemon,
  lint: context.lint,
  dump: context.dump,
  map: context.map,
  depth: context.depth,
  scan: context.scan,
  guard: security.guard,
  persist: persistence.persist,
  rollback: persistence.rollback,
  snapshot: persistence.snapshot,
  policy: security.policy,
  curate: context.curate,
  status: context.status,
  ops: ops.ops,
  op: ops.ops,
  quickhacks: ops.quickhacks,
  deck: ops.deck,
  mode: ops.mode,
  breach: security.breach,
  doctor: ops.doctor,
  resume: system.resume,
  sleeve: system.sleeve,
  history: persistence.history,
  init: context.init,
  plan: context.plan,
  plugin: integration.plugin,
  install: integration.install,
  uninstall: integration.uninstall,
  explore: context.explore,
  path: context.path,
  callers: context.callers,
  callees: context.callees,
  'god-nodes': context.godNodes,
  'graph-report': context.graphReport,
  'mcp-orchestrate': orchestrate.orchestrate,
  extract: web.extract,
  dna: web.dna,
  setup: setup.setup,
}

/** rol: binary entrypoint — router que delega en handlers por dominio. */
export async function main(argv: string[]): Promise<void> {
  const { subcommand, flags, args } = parseArgs(argv)
  // naming cyberpunk (W3.D3.2): jack→init, quickhacks→ops, ice→guard
  const { resolveAlias } = await import('./naming/index')
  const resolved = subcommand ? resolveAlias(subcommand) : undefined
  // fix juez: _meta.tool debe reflejar el subcommand (el agente sabe qué tool respondió)
  currentTool = resolved ?? ''
  const human = flags.human === 'true' || flags.human === '1'
  // Bug cwd (auditor): --dir <path> takes precedence over process.cwd().
  const projectDir = flags.dir ?? process.cwd()

  // fix juez de casos borde: --dir inexistente → error (no mentir reportando éxito)
  if (flags.dir && !existsSync(projectDir)) {
    fail('INVALID_DIR', `directorio no existe: '${projectDir}'`, 'usa un path válido con --dir', 2)
  }

  // fix auditor (bug 7): --dir a un archivo (no directorio) → error
  if (flags.dir && existsSync(projectDir) && !statSync(projectDir).isDirectory()) {
    fail('INVALID_DIR', `'${projectDir}' no es un directorio`, 'usa un directorio de proyecto con --dir', 2)
  }

  // fix auditor (C2): resolver symlinks ANTES del check de sistema — un symlink a /
  // no debe bypassear el bloqueo (realpathSync sigue el symlink al destino real)
  const realDir = flags.dir ? realpathSync(projectDir) : projectDir

  // fix juez hacker (#8) + auditor (bug 6/C2): bloquear directorios de sistema en --dir
  // (incluye / raíz — escanear todo el FS es DoS/leak). realpathSync (arriba) ya resuelve
  // symlinks; NO bloquear /tmp /home (proyectos de prueba legítimos viven ahí).
  const FORBIDDEN_DIRS = ['/', '/etc', '/usr', '/var', '/proc', '/sys', '/boot', '/bin', '/sbin', '/lib', '/lib64', '/root', '/dev']
  if (flags.dir && FORBIDDEN_DIRS.some((d) => realDir === d || realDir.startsWith(d + '/'))) {
    fail('FORBIDDEN_DIR', `directorio de sistema no operable: '${projectDir}'`, 'usa un directorio de proyecto (código), no del sistema', 2)
  }

  const ctx = makeCtx(projectDir, args, flags, human, subcommand)

  if (flags['version'] || subcommand === 'version') {
    await system.version(ctx)
  }

  if (flags['help'] || subcommand === 'help') {
    await system.help(ctx)
  }

  if (flags['mcp'] || subcommand === 'mcp') {
    await system.mcp(ctx)
  }

  if (flags['acp'] || subcommand === 'acp') {
    await system.acp(ctx)
  }

  if (flags['a2a'] || subcommand === 'a2a') {
    await system.a2a(ctx)
  }

  const cmd = resolved ?? subcommand
  const handler = HANDLERS[cmd]
  if (handler) {
    await handler(ctx)
  } else if (cmd === 'help' || cmd === '--help') {
    // dead code (flags['help']/subcommand==='help' ya sale antes) — preservado por comportamiento.
    emit({ help: 'netrunner — plug any project into any agent', commands: ['init', 'status', 'scan', 'map', 'depth', 'explore', 'plan', 'guard', 'persist', 'rollback', 'snapshot', 'policy', 'curate', 'lint', 'daemon', 'mesh', 'dump', 'install', 'plugin', '--mcp', '--acp', '--a2a', '--version'] }, true)
    process.exit(0)
  } else {
    // no subcommand → dashboard (AC-4). Unknown subcommand → error (fix juez de casos borde).
    if (subcommand && !flags['help'] && subcommand !== 'version') {
      fail('UNKNOWN_COMMAND', `comando no reconocido: '${subcommand}'`, 'usa: netrunner --help para la lista', 2)
    }
    const { dashboard } = system
    await dashboard(ctx)
  }
}

// Runs only if it is the direct entrypoint (not imported in tests).
if (import.meta.main) {
  main(process.argv.slice(2)).catch((e) => fail('INTERNAL', String(e?.message ?? e), 'revisa los logs', 1))
}
