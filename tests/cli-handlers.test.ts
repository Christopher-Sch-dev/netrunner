/**
 * rol: tests DIRECTOS de los handlers del CLI (src/cli/commands/*) — P6 gap fix.
 * Antes los handlers SOLO se ejercitaban vía cli.test.ts/cli-plan.test.ts/status.test.ts,
 * que spawnan main() y leen el JSON de stdout — NUNCA importan el handler en sí
 * (mandamiento de mutation: un test que solo lee output no testea las ramas del handler).
 *
 * Acá se importa cada handler y se mockea su módulo de dominio.
 * Patrón (vitest, type-safe):
 *  - holder en `vi.hoisted()` con `vi.fn()` por mock → la fábrica de `vi.mock` lo referencía
 *    directamente (sin rest-spread, evita TS2556) y el `vi.fn` infiere `Mock<(...:any[])=>any>`.
 *  - variar por-test con `holder.fn.mockImplementation(...)` (call-time, cachea bien).
 *  - `vi.mock('bun:sqlite')` (igual que cli.test.ts) para que los dynamic-import que llegan
 *    a graph.ts/queries.ts resuelvan en vitest (node).
 * Aísla la orquestación del handler (branching, exit codes, emit/fail) para mutation.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { HandlerContext } from '../src/cli/commands/types'

// mock bun:sqlite → node:sqlite (mismo patrón que cli.test.ts).
vi.mock('bun:sqlite', () => {
  const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')
  return {
    Database: class extends DatabaseSync {
      constructor(path: string) { super(path) }
      query(sql: string) {
        const db = this
        return {
          get: (...args: unknown[]) => (db.prepare(sql) as { get: (...a: unknown[]) => unknown }).get(...args),
          all: (...args: unknown[]) => (db.prepare(sql) as { all: (...a: unknown[]) => unknown }).all(...args),
          run: (...args: unknown[]) => (db.prepare(sql) as { run: (...a: unknown[]) => unknown }).run(...args),
        }
      }
    },
  }
})

/** rol: fake del contexto inyectado a cada handler. Captura emit y lanza en fail. */
function makeCtx(overrides: Partial<HandlerContext> = {}): { ctx: HandlerContext; emitted: unknown[] } {
  const emitted: unknown[] = []
  const ctx: HandlerContext = {
    projectDir: '/tmp/ctx',
    args: [],
    flags: {},
    human: false,
    subcommand: '',
    emit: (data: unknown) => { emitted.push(data) },
    fail: (code, message, suggestion, exitCode = 1) => {
      emitted.push({ error: true, code, message, suggestion })
      throw new Error(`__EXIT__${exitCode}`)
    },
    ...overrides,
  }
  return { ctx, emitted }
}

/** rol: corre un handler con process.exit → excepción (no mata vitest). */
async function safeInvoke(fn: () => Promise<void>): Promise<void> {
  const realExit = process.exit
  ;(process as unknown as { exit: (c?: number) => never }).exit = ((code?: number) => {
    throw new Error(`__EXIT__${code ?? 0}`)
  }) as never
  try {
    await fn()
  } catch (e) {
    if (!(e instanceof Error && e.message.startsWith('__EXIT__'))) throw e
  } finally {
    ;(process as unknown as { exit: (c?: number) => never }).exit = realExit
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

// ---------- context.ts ----------
const ctxM = vi.hoisted(() => ({
  buildSnapshot: vi.fn(async () => ({ mock: true })),
  canonStale: vi.fn(() => false),
  generateDocs: vi.fn(async () => {}),
  shortestPath: vi.fn(async (): Promise<string[]> => []),
  explore: vi.fn(async (n: string) => ({ nodes: [{ id: `def:${n}` }] })),
  callers: vi.fn(async (): Promise<{ nodes: Array<{ id?: string; caller?: string }> }> => ({ nodes: [] })),
  generatePlan: vi.fn(async (g: string): Promise<{ goal: string; steps: { action: string; target: string }[] }> => ({ goal: g, steps: [] })),
  curate: vi.fn((obs: unknown[]) => obs.map(() => ({ action: 'keep' }))),
}))
vi.mock('../src/context/snapshot', () => ({ buildSnapshot: ctxM.buildSnapshot })) 
vi.mock('../src/canon/stale', () => ({ canonStale: ctxM.canonStale }))
vi.mock('../src/generate/index', () => ({ generateDocs: ctxM.generateDocs }))
vi.mock('../src/path/index', () => ({ shortestPath: ctxM.shortestPath }))
vi.mock('../src/context/queries', () => ({
  explore: ctxM.explore,
  callers: ctxM.callers,
}))
vi.mock('../src/plan/index', () => ({ generatePlan: ctxM.generatePlan }))
vi.mock('../src/auto/curator', () => ({ curate: ctxM.curate }))

describe('cli/commands/context.ts (handlers directos)', () => {
  it('status emite snapshot con canonStale', async () => {
    const { status } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => status(ctx))
    expect((emitted[0] as { mock: boolean }).mock).toBe(true)
    expect((emitted[0] as { canonStale: boolean }).canonStale).toBe(false)
  })

  it('path sin from/to → fail MISSING_REQUIRED (exit 2)', async () => {
    const { path } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx()
    await expect(path(ctx)).rejects.toThrow('__EXIT__2')
    expect((emitted[0] as { code: string }).code).toBe('MISSING_REQUIRED')
  })

  it('path con dos símbolos usa shortestPath y emite {from,to,path}', async () => {
    ctxM.shortestPath.mockImplementation(async () => ['a', 'b'])
    const { path } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx({ args: ['X', 'Y'] })
    await safeInvoke(() => path(ctx))
    expect((emitted[0] as { from: string }).from).toBe('X')
    expect((emitted[0] as { path: string[] }).path).toEqual(['a', 'b'])
  })

  it('explore sin nombre → fail MISSING_REQUIRED', async () => {
    const { explore } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx()
    await expect(explore(ctx)).rejects.toThrow('__EXIT__2')
    expect((emitted[0] as { code: string }).code).toBe('MISSING_REQUIRED')
  })

  it('explore con nombre emite el nodo def del símbolo', async () => {
    const { explore } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx({ args: ['login'] })
    await safeInvoke(() => explore(ctx))
    expect((emitted[0] as { nodes: Array<{ id: string }> }).nodes[0].id).toBe('def:login')
  })

  it('plan sin goal → fail MISSING_REQUIRED', async () => {
    const { plan } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx()
    await expect(plan(ctx)).rejects.toThrow('__EXIT__2')
    expect((emitted[0] as { code: string }).code).toBe('MISSING_REQUIRED')
  })

  it('plan con goal une args y emite {plan:{goal,steps}}', async () => {
    ctxM.generatePlan.mockImplementation(async (g) => ({ goal: g, steps: [{ action: 'explore', target: 'x' }] }))
    const { plan } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx({ args: ['agregar', 'login'] })
    await safeInvoke(() => plan(ctx))
    const p = (emitted[0] as { plan: { goal: string; steps: unknown[] } }).plan
    expect(p.goal).toBe('agregar login')
    expect(p.steps).toHaveLength(1)
  })

  it('curate emite actions parseando el JSON de args', async () => {
    const { curate } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx({ args: ['[{"x":1}]'] })
    await safeInvoke(() => curate(ctx))
    expect((emitted[0] as { actions: unknown[] }).actions).toHaveLength(1)
  })

  it('callers sin símbolo → fail MISSING_REQUIRED', async () => {
    const { callers } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx()
    await expect(callers(ctx)).rejects.toThrow('__EXIT__2')
    expect((emitted[0] as { code: string }).code).toBe('MISSING_REQUIRED')
  })

  it('callers con símbolo → explora e emite sus callers', async () => {
    ctxM.explore.mockImplementation(async () => ({ nodes: [{ id: 'def:login' }] }))
    ctxM.callers.mockImplementation(async () => ({ nodes: [{ caller: 'a' }] }))
    const { callers } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx({ args: ['login'] })
    await safeInvoke(() => callers(ctx))
    expect(emitted[0]).toEqual({ nodes: [{ caller: 'a' }] })
  })

  it('callers: sin nodo def → emite found:false', async () => {
    ctxM.explore.mockImplementation(async () => ({ nodes: [] }))
    const { callers } = await import('../src/cli/commands/context')
    const { ctx, emitted } = makeCtx({ args: ['nope'] })
    await safeInvoke(() => callers(ctx))
    expect((emitted[0] as { found: boolean }).found).toBe(false)
  })
})

// ---------- ops.ts ----------
const opsM = vi.hoisted(() => ({
  runOp: vi.fn(async () => ({ ok: true })),
  logOperation: vi.fn(() => {}),
  emitEvent: vi.fn(() => {}),
  recordLatency: vi.fn(() => {}),
  listQuickhacks: vi.fn(() => [
    { kind: 'test', cost: 1, cooldownMs: 100 },
    { kind: 'build', cost: 2, cooldownMs: 200 },
  ]),
  netMode: vi.fn((p: string) => [`profile.${p}`]),
}))
// holder unificado hooks/index (lo usan ops.ts y system.ts → UN solo vi.mock).
const hooksM = vi.hoisted(() => ({
  emitSignal: vi.fn((_d: string, _type: string, _msg: string) => {}),
  pendingSignals: vi.fn((): unknown[] => []),
  markSignalsRead: vi.fn(() => {}),
}))
// holder unificado policy/index (lo usan ops.ts y security.ts → UN solo vi.mock).
const policyM = vi.hoisted(() => ({
  evalPolicy: vi.fn(() => 'deny'),
}))
vi.mock('../src/tools/ops', () => ({ runOp: opsM.runOp }))
vi.mock('../src/policy/index', () => ({ evaluatePolicy: policyM.evalPolicy }))
vi.mock('../src/history/index', () => ({ logOperation: opsM.logOperation }))
vi.mock('../src/context/events', () => ({ emitEvent: opsM.emitEvent }))
vi.mock('../src/metrics/index', () => ({ recordLatency: opsM.recordLatency }))
vi.mock('../src/hooks/index', () => ({
  emitSignal: hooksM.emitSignal,
  pendingSignals: hooksM.pendingSignals,
  markSignalsRead: hooksM.markSignalsRead,
}))
vi.mock('../src/quickhacks/index', () => ({ listQuickhacks: opsM.listQuickhacks }))
vi.mock('../src/net-mode/index', () => ({ netMode: opsM.netMode }))

describe('cli/commands/ops.ts (handlers directos)', () => {
  it('ops sin approval → policy deny, emite error, exit 1', async () => {
    policyM.evalPolicy.mockReturnValue('deny')
    const { ops } = await import('../src/cli/commands/ops')
    const { ctx, emitted } = makeCtx({ args: ['test'] })
    await safeInvoke(() => ops(ctx))
    expect((emitted[0] as { ok: boolean }).ok).toBe(false)
    expect((emitted[0] as { error: string }).error).toContain('deny')
  })

  it('ops con approval=true → ejecuta runOp ok', async () => {
    policyM.evalPolicy.mockReturnValue('allow')
    opsM.runOp.mockResolvedValue({ ok: true })
    const { ops } = await import('../src/cli/commands/ops')
    const { ctx, emitted } = makeCtx({ args: ['test'], flags: { approval: 'true' } })
    await safeInvoke(() => ops(ctx))
    expect((emitted[0] as { ok: boolean }).ok).toBe(true)
  })

  it('ops fallida (runOp ok:false) → emite ok:false', async () => {
    opsM.runOp.mockResolvedValue({ ok: false })
    const { ops } = await import('../src/cli/commands/ops')
    const { ctx, emitted } = makeCtx({ args: ['test'], flags: { approval: '1' } })
    await safeInvoke(() => ops(ctx))
    expect((emitted[0] as { ok: boolean }).ok).toBe(false)
  })

  it('ops build emite señal canon-pendiente', async () => {
    policyM.evalPolicy.mockReturnValue('allow')
    opsM.runOp.mockResolvedValue({ ok: true })
    const { ops } = await import('../src/cli/commands/ops')
    const { ctx } = makeCtx({ args: ['build'], flags: { approval: 'true' } })
    await safeInvoke(() => ops(ctx))
    expect(hooksM.emitSignal).toHaveBeenCalled()
    expect(hooksM.emitSignal.mock.calls[0]![1]).toBe('canon-pendiente')
  })

  it('quickhacks lista los quickhacks', async () => {
    const { quickhacks } = await import('../src/cli/commands/ops')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => quickhacks(ctx))
    expect((emitted[0] as { quickhacks: unknown[] }).quickhacks).toHaveLength(2)
  })

  it('mode default → perfil explore', async () => {
    const { mode } = await import('../src/cli/commands/ops')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => mode(ctx))
    expect((emitted[0] as { tools: string[] }).tools).toEqual(['profile.explore'])
  })

  it('mode con perfil explícito', async () => {
    const { mode } = await import('../src/cli/commands/ops')
    const { ctx, emitted } = makeCtx({ args: ['audit'] })
    await safeInvoke(() => mode(ctx))
    expect((emitted[0] as { tools: string[] }).tools).toEqual(['profile.audit'])
  })
})

// ---------- persistence.ts ----------
const persM = vi.hoisted(() => ({
  persistDecision: vi.fn(() => ({ slug: 'mi-decision', path: '/tmp/d' })),
  listSnapshots: vi.fn(() => ({ snapshots: [{ id: 'a' }] })),
  createSnapshot: vi.fn(() => ({ id: 's' })),
  restoreSnapshot: vi.fn(() => {}),
}))
vi.mock('../src/persist/index', () => ({ persistDecision: persM.persistDecision }))
vi.mock('../src/rollback/index', () => ({
  listSnapshots: persM.listSnapshots,
  createSnapshot: persM.createSnapshot,
  restoreSnapshot: persM.restoreSnapshot,
}))

describe('cli/commands/persistence.ts (handlers directos)', () => {
  it('persist une args y persiste la decisión', async () => {
    const { persist } = await import('../src/cli/commands/persistence')
    const { ctx, emitted } = makeCtx({ args: ['mi', 'decision'] })
    await safeInvoke(() => persist(ctx))
    expect((emitted[0] as { slug: string }).slug).toBe('mi-decision')
  })

  it('rollback restore sin id → error MISSING_REQUIRED exit 2', async () => {
    const { rollback } = await import('../src/cli/commands/persistence')
    const { ctx, emitted } = makeCtx({ args: ['restore'] })
    await safeInvoke(() => rollback(ctx))
    expect((emitted[0] as { code: string }).code).toBe('MISSING_REQUIRED')
  })

  it('rollback restore <id> restaura el snapshot', async () => {
    const { rollback } = await import('../src/cli/commands/persistence')
    const { ctx, emitted } = makeCtx({ args: ['restore', 'abc123'] })
    await safeInvoke(() => rollback(ctx))
    expect((emitted[0] as { restored: string }).restored).toBe('abc123')
  })

  it('rollback por defecto lista snapshots', async () => {
    const { rollback } = await import('../src/cli/commands/persistence')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => rollback(ctx))
    expect((emitted[0] as { snapshots: unknown[] }).snapshots).toHaveLength(1)
  })

  it('rollback create crea un snapshot', async () => {
    const { rollback } = await import('../src/cli/commands/persistence')
    const { ctx, emitted } = makeCtx({ args: ['create'] })
    await safeInvoke(() => rollback(ctx))
    expect((emitted[0] as { id: string }).id).toBe('s')
  })
})

// ---------- security.ts ----------
const secM = vi.hoisted(() => ({
  guardCheck: vi.fn((): { ok: boolean; issues: Array<{ file: string; reason: string }> } => ({ ok: true, issues: [] })),
}))
vi.mock('../src/guard/index', () => ({ guardCheck: secM.guardCheck }))
// policy/index ya mockeado (una sola vez, vía policyM) por la sección de ops.ts.

describe('cli/commands/security.ts (handlers directos)', () => {
  it('guard ok', async () => {
    const { guard } = await import('../src/cli/commands/security')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => guard(ctx))
    expect((emitted[0] as { ok: boolean }).ok).toBe(true)
  })

  it('guard con issues → exit 1 (fail-closed)', async () => {
    secM.guardCheck.mockReturnValueOnce({ ok: false, issues: [{ file: 'x', reason: 'secret' }] })
    const { guard } = await import('../src/cli/commands/security')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => guard(ctx))
    expect((emitted[0] as { ok: boolean }).ok).toBe(false)
  })

  it('policy emite intención + decisión (readonly) allow', async () => {
    policyM.evalPolicy.mockReturnValue('allow')
    const { policy } = await import('../src/cli/commands/security')
    const { ctx, emitted } = makeCtx({ flags: { readonly: 'true' } })
    await safeInvoke(() => policy(ctx))
    expect((emitted[0] as { intent: string }).intent).toBe('explore')
    expect((emitted[0] as { decision: string }).decision).toBe('allow')
  })

  it('policy emite deny en intención no permitida', async () => {
    policyM.evalPolicy.mockReturnValue('deny')
    const { policy } = await import('../src/cli/commands/security')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => policy(ctx))
    expect((emitted[0] as { decision: string }).decision).toBe('deny')
  })
})

// ---------- system.ts ----------
const sysM = vi.hoisted(() => ({
  exportSleeve: vi.fn(() => ({ decisions: [] })),
  importSleeve: vi.fn(() => {}),
  resume: vi.fn(async () => ({ state: true })),
}))
vi.mock('../src/sleeve/index', () => ({
  exportSleeve: sysM.exportSleeve,
  importSleeve: sysM.importSleeve,
}))
vi.mock('../src/resume/index', () => ({ resume: sysM.resume }))

describe('cli/commands/system.ts (handlers directos)', () => {
  it('version emite name+version', async () => {
    const { version } = await import('../src/cli/commands/system')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => version(ctx))
    expect((emitted[0] as { name: string }).name).toBe('netrunner')
    expect((emitted[0] as { version: string }).version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('help emite usage y la lista de comandos', async () => {
    const { help } = await import('../src/cli/commands/system')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => help(ctx))
    expect((emitted[0] as { name: string }).name).toBe('netrunner')
    expect((emitted[0] as { commands: string[] }).commands).toContain('init')
  })

  it('sleeve export escribe el archivo y emite exportedTo', async () => {
    const { sleeve } = await import('../src/cli/commands/system')
    const { ctx, emitted } = makeCtx({ projectDir: '/tmp/sleeveproj' })
    await safeInvoke(() => sleeve(ctx))
    expect((emitted[0] as { exportedTo: string }).exportedTo).toContain('.netrunner/sleeve.json')
  })

  it('sleeve import inexistente → error + exit 1', async () => {
    const { sleeve } = await import('../src/cli/commands/system')
    const { ctx, emitted } = makeCtx({ args: ['import', '/no/existe.json'] })
    await safeInvoke(() => sleeve(ctx))
    expect((emitted[0] as { imported: boolean }).imported).toBe(false)
  })

  it('resume emite estado + señales pendientes y las marca leídas', async () => {
    hooksM.pendingSignals.mockReturnValue([{ id: 1 }])
    const { resume } = await import('../src/cli/commands/system')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => resume(ctx))
    expect((emitted[0] as { signals: unknown[] }).signals).toHaveLength(1)
    expect(hooksM.markSignalsRead).toHaveBeenCalled()
  })
})

// ---------- integration.ts ----------
const intM = vi.hoisted(() => ({
  generatePlugin: vi.fn((n: string, v: string) => ({ pluginDir: `${n}-${v}`, written: [] })),
  install: vi.fn((t: string) => {
    if (t === 'mcp') return { ok: true }
    throw new Error('unknown target')
  }),
  uninstall: vi.fn((t: string) => ({ ok: true, target: t })),
  meshProjects: vi.fn(async (dirs: string[]) => ({ dirs })),
}))
vi.mock('../src/plugin/generate', () => ({ generatePlugin: intM.generatePlugin }))
vi.mock('../src/install', () => ({
  install: intM.install,
  uninstall: intM.uninstall,
}))
vi.mock('../src/mesh/index', () => ({ meshProjects: intM.meshProjects }))

describe('cli/commands/integration.ts (handlers directos)', () => {
  it('plugin genera el plugin con name+version', async () => {
    const { plugin } = await import('../src/cli/commands/integration')
    const { ctx, emitted } = makeCtx({ args: ['foo', '2.0.0'] })
    await safeInvoke(() => plugin(ctx))
    expect((emitted[0] as { pluginDir: string }).pluginDir).toBe('foo-2.0.0')
  })

  it('install con target desconocido → fail UNKNOWN_TARGET', async () => {
    const { install } = await import('../src/cli/commands/integration')
    const { ctx, emitted } = makeCtx({ args: ['bogus'] })
    await safeInvoke(() => install(ctx))
    expect((emitted[0] as { code: string }).code).toBe('UNKNOWN_TARGET')
  })

  it('uninstall con target válido emite el resultado', async () => {
    const { uninstall } = await import('../src/cli/commands/integration')
    const { ctx, emitted } = makeCtx({ args: ['mcp'] })
    await safeInvoke(() => uninstall(ctx))
    expect((emitted[0] as { ok: boolean }).ok).toBe(true)
  })

  it('mesh usa los args como dirs (o el projectDir)', async () => {
    const { mesh } = await import('../src/cli/commands/integration')
    const { ctx, emitted } = makeCtx({ args: ['/projA', '/projB'] })
    await safeInvoke(() => mesh(ctx))
    expect((emitted[0] as { dirs: string[] }).dirs).toEqual(['/projA', '/projB'])
  })
})

// ---------- orchestrate.ts ----------
const orchM = vi.hoisted(() => ({
  discoverServers: vi.fn(() => [
    { name: 'echo', command: 'node', args: [] },
  ]),
  McpOrchestrator: class {
    async connectAll(c: unknown[]) { return c.map(() => ({ connected: true })) }
    listTools() { return [{ id: 'echo.echo' }] }
    async close() {}
  },
}))
vi.mock('../src/mcp-orchestrate/index', () => ({
  discoverServers: orchM.discoverServers,
  McpOrchestrator: orchM.McpOrchestrator,
}))

describe('cli/commands/orchestrate.ts (handler directo)', () => {
  it('orchestrate descubre servers y lista tools', async () => {
    const { orchestrate } = await import('../src/cli/commands/orchestrate')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => orchestrate(ctx))
    expect((emitted[0] as { tools: Array<{ id: string }> }).tools[0].id).toBe('echo.echo')
  })
})

// ---------- setup.ts ----------
const setupM = vi.hoisted(() => ({ setup: vi.fn(async () => ({ ok: true })) }))
vi.mock('../src/setup/index', () => ({ setup: setupM.setup }))

describe('cli/commands/setup.ts (handler directo)', () => {
  it('setup ok', async () => {
    const { setup } = await import('../src/cli/commands/setup')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => setup(ctx))
    expect((emitted[0] as { ok: boolean }).ok).toBe(true)
  })

  it('setup fallida → fail SETUP_FAILED exit 1', async () => {
    setupM.setup.mockRejectedValue(new Error('boom'))
    const { setup } = await import('../src/cli/commands/setup')
    const { ctx, emitted } = makeCtx()
    await safeInvoke(() => setup(ctx))
    expect((emitted[0] as { code: string }).code).toBe('SETUP_FAILED')
  })
})

// ---------- web.ts ----------
const webM = vi.hoisted(() => ({
  extractWeb: vi.fn(async () => ({ title: 'hola' })),
  inspectWeb: vi.fn(async () => ({ perf: 1 })),
  dnaScan: vi.fn(async () => ({ colors: {}, url: 'https://x.com' })),
  emitDesignMd: vi.fn(() => 'md'),
  emitVariablesCss: vi.fn(() => ':root{}'),
  emitDesignTokensJson: vi.fn(() => '{}'),
}))
vi.mock('../src/web/extract', () => ({ extractWeb: webM.extractWeb }))
vi.mock('../src/web/inspect', () => ({ inspectWeb: webM.inspectWeb }))
vi.mock('../src/dna/index', () => ({ dnaScan: webM.dnaScan }))
vi.mock('../src/dna/dtcg', () => ({
  emitDesignMd: webM.emitDesignMd,
  emitVariablesCss: webM.emitVariablesCss,
  emitDesignTokensJson: webM.emitDesignTokensJson,
}))

describe('cli/commands/web.ts (handlers directos)', () => {
  it('extract sin URL → fail MISSING_REQUIRED', async () => {
    const { extract } = await import('../src/cli/commands/web')
    const { ctx, emitted } = makeCtx()
    await expect(extract(ctx)).rejects.toThrow('__EXIT__2')
    expect((emitted[0] as { code: string }).code).toBe('MISSING_REQUIRED')
  })

  it('extract con URL emite el resultado', async () => {
    const { extract } = await import('../src/cli/commands/web')
    const { ctx, emitted } = makeCtx({ args: ['https://x.com'] })
    await safeInvoke(() => extract(ctx))
    expect((emitted[0] as { title: string }).title).toBe('hola')
  })

  it('inspect sin URL → fail MISSING_REQUIRED', async () => {
    const { inspect } = await import('../src/cli/commands/web')
    const { ctx, emitted } = makeCtx()
    await expect(inspect(ctx)).rejects.toThrow('__EXIT__2')
    expect((emitted[0] as { code: string }).code).toBe('MISSING_REQUIRED')
  })

  it('dna sin URL → fail MISSING_REQUIRED', async () => {
    const { dna } = await import('../src/cli/commands/web')
    const { ctx, emitted } = makeCtx()
    await expect(dna(ctx)).rejects.toThrow('__EXIT__2')
    expect((emitted[0] as { code: string }).code).toBe('MISSING_REQUIRED')
  })

  it('dna con --css emite variables.css (texto plano)', async () => {
    const { dna } = await import('../src/cli/commands/web')
    const { ctx, emitted } = makeCtx({ args: ['https://x.com'], flags: { css: 'true' } })
    await safeInvoke(() => dna(ctx))
    expect(emitted[0]).toBe(':root{}')
  })

  it('dna con --json emite design-tokens.json', async () => {
    const { dna } = await import('../src/cli/commands/web')
    const { ctx, emitted } = makeCtx({ args: ['https://x.com'], flags: { json: 'true' } })
    await safeInvoke(() => dna(ctx))
    expect(emitted[0]).toBe('{}')
  })

  it('dna por defecto emite el DnaResult', async () => {
    const { dna } = await import('../src/cli/commands/web')
    const { ctx, emitted } = makeCtx({ args: ['https://x.com'] })
    await safeInvoke(() => dna(ctx))
    expect((emitted[0] as { url: string }).url).toBe('https://x.com')
  })
})
