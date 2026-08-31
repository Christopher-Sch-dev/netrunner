/**
 * rol: tests DIRECTOS de src/tools/index.ts — P6 gap fix.
 * graphAndStackTools() arma las ToolSpec del contrato (explore/callers/callees/impact/
 * stack/rg/op.test/build/lint) como FUENTE ÚNICA de las 4 vistas (DEC-005 §3).
 * Se importa el módulo y se verifica la composición: ids únicos, readOnly, family,
 * capabilities y que cada execute delega en el dominio (mockeado) con el ToolContext.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ToolContext } from '../src/core/registry'

const tlM = vi.hoisted(() => ({
  explore: vi.fn(async () => ({ nodes: [{ id: 'def:x' }] })),
  callers: vi.fn(async () => ({ nodes: [] })),
  callees: vi.fn(async () => ({ nodes: [] })),
  impact: vi.fn(async () => ({ nodes: [] })),
  detectStack: vi.fn(async () => ({ language: 'typescript', framework: null })),
}))
vi.mock('../src/context/queries', () => ({
  explore: tlM.explore,
  callers: tlM.callers,
  callees: tlM.callees,
  impact: tlM.impact,
}))
vi.mock('../src/context/detect', () => ({ detectStack: tlM.detectStack }))
// rg.ts y ops.ts son builders puros (sin I/O al construir specs) → se usan reales.
// bun:sqlite shim (igual que cli.test.ts) por si el dynamic-import toca graph/queries.
vi.mock('bun:sqlite', () => {
  const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')
  return {
    Database: class extends DatabaseSync {
      constructor(path: string) { super(path) }
      query() { return this }
    },
  }
})

const ctx: ToolContext = { projectDir: '/tmp/proj', secrets: {}, profile: 'explore' }

describe('tools/index (graphAndStackTools — contrato único)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('expone las 9 tools del contrato (ids únicos y sin duplicados)', async () => {
    const { graphAndStackTools } = await import('../src/tools/index')
    const tools = graphAndStackTools()
    const ids = tools.map((t) => t.id)
    expect(ids.sort()).toEqual([
      'graph.explore', 'graph.callers', 'graph.callees', 'graph.impact',
      'stack.info', 'search.rg', 'op.test', 'op.build', 'op.lint',
    ].sort())
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('las tools graph/stack/search son readOnly; las op son mutating', async () => {
    const { graphAndStackTools } = await import('../src/tools/index')
    const tools = graphAndStackTools()
    const ro = tools.filter((t) => t.id.startsWith('graph') || t.id === 'search.rg' || t.id === 'stack.info')
    const ops = tools.filter((t) => t.id.startsWith('op.'))
    expect(ro.every((t) => t.readOnly)).toBe(true)
    expect(ops.every((t) => !t.readOnly)).toBe(true)
  })

  it('graph.explore execute delega en explore() con el projectDir', async () => {
    const { graphAndStackTools } = await import('../src/tools/index')
    const tool = graphAndStackTools().find((t) => t.id === 'graph.explore')!
    const res = await tool.execute({ name: 'x' }, ctx)
    expect(tlM.explore).toHaveBeenCalledWith('x', '/tmp/proj')
    expect((res as { data: { nodes: Array<{ id: string }> } }).data.nodes[0].id).toBe('def:x')
  })

  it('graph.callers execute delega en callers()', async () => {
    const { graphAndStackTools } = await import('../src/tools/index')
    const tool = graphAndStackTools().find((t) => t.id === 'graph.callers')!
    await tool.execute({ symbol: 'login' }, ctx)
    expect(tlM.callers).toHaveBeenCalledWith('login', '/tmp/proj')
  })

  it('graph.callees execute delega en callees()', async () => {
    const { graphAndStackTools } = await import('../src/tools/index')
    const tool = graphAndStackTools().find((t) => t.id === 'graph.callees')!
    await tool.execute({ symbol: 'login' }, ctx)
    expect(tlM.callees).toHaveBeenCalledWith('login', '/tmp/proj')
  })

  it('graph.impact execute delega en impact() con depth por defecto 2', async () => {
    const { graphAndStackTools } = await import('../src/tools/index')
    const tool = graphAndStackTools().find((t) => t.id === 'graph.impact')!
    await tool.execute({ symbol: 'login' }, ctx)
    expect(tlM.impact).toHaveBeenCalledWith('login', '/tmp/proj', 2)
  })

  it('graph.impact usa el depth provisto', async () => {
    const { graphAndStackTools } = await import('../src/tools/index')
    const tool = graphAndStackTools().find((t) => t.id === 'graph.impact')!
    await tool.execute({ symbol: 'login', depth: 5 }, ctx)
    expect(tlM.impact).toHaveBeenCalledWith('login', '/tmp/proj', 5)
  })

  it('stack.info execute delega en detectStack()', async () => {
    const { graphAndStackTools } = await import('../src/tools/index')
    const tool = graphAndStackTools().find((t) => t.id === 'stack.info')!
    const res = await tool.execute({}, ctx)
    expect(tlM.detectStack).toHaveBeenCalledWith('/tmp/proj')
    expect((res as { data: { language: string } }).data.language).toBe('typescript')
  })

  it('cada spec declara family y capabilities coherentes', async () => {
    const { graphAndStackTools } = await import('../src/tools/index')
    const tools = graphAndStackTools()
    for (const t of tools) {
      expect(typeof t.description).toBe('string')
      expect(t.description.length).toBeGreaterThan(0)
      expect(t.capabilities.length).toBeGreaterThan(0)
    }
    expect(tools.find((t) => t.id === 'search.rg')!.family).toBe('graph')
    expect(tools.find((t) => t.id === 'op.test')!.family).toBe('op')
  })
})
