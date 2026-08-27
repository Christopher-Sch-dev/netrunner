import { describe, it, expect } from 'vitest'
import { ToolRegistry } from '../src/core/registry'
import { loadPlugin, unloadPlugin, type Plugin, type PluginContext } from '../src/core/plugin'

// rol: tests del plugin system (AC-1..6 de features/plugin-system.feature).
// Extension-points + efectos reversibles (patrón Cordis).

describe('plugin system (extension-points + reversible)', () => {
  it('cargar un plugin registra sus tools (AC-1/2/3)', () => {
    const registry = new ToolRegistry()
    const plugin: Plugin = {
      id: 'ops',
      manifest: { stack: ['typescript'], capabilities: ['ops'] },
      apply(ctx: PluginContext) {
        ctx.registerTool({
          id: 'op.test',
          description: 'test op',
          family: 'op',
          readOnly: false,
          capabilities: ['ops'],
          inputSchema: {},
          execute: async () => ({ ok: true }),
        })
      },
    }

    loadPlugin(plugin, registry, { projectDir: '/tmp' })

    expect(registry.listIds()).toContain('op.test')
  })

  it('descargar un plugin deshace sus tools (AC-4, reversible)', () => {
    const registry = new ToolRegistry()
    const plugin: Plugin = {
      id: 'ops',
      manifest: { stack: ['typescript'], capabilities: ['ops'] },
      apply(ctx: PluginContext) {
        ctx.registerTool({
          id: 'op.test',
          description: 'test op',
          family: 'op',
          readOnly: false,
          capabilities: ['ops'],
          inputSchema: {},
          execute: async () => ({ ok: true }),
        })
      },
    }

    const handle = loadPlugin(plugin, registry, { projectDir: '/tmp' })
    expect(registry.listIds()).toContain('op.test')

    unloadPlugin(handle, registry)

    expect(registry.listIds()).not.toContain('op.test')
  })

  it('cargar el mismo plugin dos veces no duplica (AC-5, idempotente)', () => {
    const registry = new ToolRegistry()
    const plugin: Plugin = {
      id: 'ops',
      manifest: { stack: ['typescript'], capabilities: ['ops'] },
      apply(ctx: PluginContext) {
        ctx.registerTool({
          id: 'op.test',
          description: 'test op',
          family: 'op',
          readOnly: false,
          capabilities: ['ops'],
          inputSchema: {},
          execute: async () => ({ ok: true }),
        })
      },
    }

    loadPlugin(plugin, registry, { projectDir: '/tmp' })
    // segunda carga: idempotente (no duplica, no lanza)
    expect(() => loadPlugin(plugin, registry, { projectDir: '/tmp' })).not.toThrow()
    expect(registry.listIds().filter((id) => id === 'op.test').length).toBe(1)
  })
})
